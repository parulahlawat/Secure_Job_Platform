
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.models import Connection, ConnectionStatus, Base
from app.db.database import get_db
from app.modules.connections.schemas import ConnectionCreate, ConnectionResponse, ConnectionAction
from app.modules.auth.routes import get_current_user
from app.db.models import User

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.get("/received", response_model=list[ConnectionResponse])
def get_received_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all pending connection requests received by the current user."""
    requests = db.query(Connection).filter(
        Connection.receiver_id == current_user.id,
        Connection.status == ConnectionStatus.pending
    ).all()
    return requests

@router.post("/request", response_model=ConnectionResponse)
def send_connection_request(request: ConnectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if a connection already exists in either direction with status pending or accepted
    existing = db.query(Connection).filter(
        (
            ((Connection.sender_id == current_user.id) & (Connection.receiver_id == request.receiver_id)) |
            ((Connection.sender_id == request.receiver_id) & (Connection.receiver_id == current_user.id))
        ) &
        (Connection.status.in_([ConnectionStatus.pending, ConnectionStatus.accepted]))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A connection or request already exists between these users.")
    connection = Connection(sender_id=current_user.id, receiver_id=request.receiver_id)
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection

@router.post("/respond", response_model=None)
def respond_connection_request(action: ConnectionAction, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Accept: returns ConnectionResponse (the accepted connection)
    Decline: deletes the request and returns {"id": ..., "deleted": True}
    """
    connection = db.query(Connection).filter_by(id=action.connection_id, receiver_id=current_user.id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found.")
    if action.accept:
        connection.status = ConnectionStatus.accepted
        db.commit()
        db.refresh(connection)
        return connection
    else:
        # On decline, delete the connection request so users can send again
        db.delete(connection)
        db.commit()
        return {"id": action.connection_id, "deleted": True}

@router.get("/my", response_model=list[ConnectionResponse])
def get_my_connections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    connections = db.query(Connection).filter(
        ((Connection.sender_id == current_user.id) | (Connection.receiver_id == current_user.id)) &
        (Connection.status == ConnectionStatus.accepted)
    ).all()
    return connections
