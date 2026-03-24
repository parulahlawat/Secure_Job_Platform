
"""
Messaging module routes (E2EE)
"""
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket
from typing import List
from sqlalchemy.orm import Session
from app.db.database import get_db

from app.db.models import Message, User, Profile, Group, GroupMember
from app.modules.messaging.schemas import MessageCreate, MessageResponse, GroupCreate, GroupResponse, GroupMessageCreate, GroupMessageResponse
from sqlalchemy.exc import IntegrityError

from app.modules.auth.routes import get_current_user

router = APIRouter()

@router.put("/with/{user_id}/mark-all-read")
async def mark_all_messages_with_user_read(
    user_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Mark all messages from user_id to current user as read"""
    messages = db.query(Message).filter(
        Message.sender_id == user_id,
        Message.recipient_id == user.id,
        Message.is_read == False
    ).all()
    for msg in messages:
        msg.is_read = True
    db.commit()
    return {"updated": len(messages)}

 # --- GROUP MESSAGING ENDPOINTS ---
@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    group = Group(name=group_data.name, created_by=user.id)
    db.add(group)
    db.commit()
    db.refresh(group)
    # Add creator and members
    member_ids = set(group_data.member_ids)
    member_ids.add(user.id)
    for uid in member_ids:
        db.add(GroupMember(group_id=group.id, user_id=uid))
    db.commit()
    # Fetch all members
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    return GroupResponse(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        created_at=group.created_at,
        members=[m.user_id for m in members]
    )

@router.get("/groups", response_model=List[GroupResponse])
async def list_groups(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    result = []
    for group in groups:
        members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        result.append(GroupResponse(
            id=group.id,
            name=group.name,
            created_by=group.created_by,
            created_at=group.created_at,
            members=[m.user_id for m in members]
        ))
    return result

import json

@router.post("/groups/{group_id}/send", response_model=GroupMessageResponse)
async def send_group_message(
    group_id: int,
    msg: GroupMessageCreate,
    db: Session = Depends(get_db),
    sender = Depends(get_current_user)
):
    # Check membership
    membership = db.query(GroupMember).filter_by(group_id=group_id, user_id=sender.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a group member")
    # Store ciphertexts as JSON string in ciphertext field
    ciphertext_json = json.dumps(msg.ciphertexts)
    message = Message(
        sender_id=sender.id,
        group_id=group_id,
        ciphertext=ciphertext_json
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    sender_profile = db.query(Profile).filter(Profile.user_id == sender.id).first()
    return GroupMessageResponse(
        id=message.id,
        group_id=group_id,
        sender_id=sender.id,
        ciphertext=message.ciphertext,
        created_at=message.created_at,
        sender_public_key=sender_profile.public_key if sender_profile else None
    )

@router.get("/groups/{group_id}/messages", response_model=List[GroupMessageResponse])
async def get_group_messages(
    group_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # Check membership
    membership = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a group member")
    messages = db.query(Message).filter(Message.group_id == group_id).order_by(Message.created_at.asc()).all()
    result = []
    for msg in messages:
        sender_profile = db.query(Profile).filter(Profile.user_id == msg.sender_id).first()
        result.append(GroupMessageResponse(
            id=msg.id,
            group_id=group_id,
            sender_id=msg.sender_id,
            ciphertext=msg.ciphertext,
            created_at=msg.created_at,
            sender_public_key=sender_profile.public_key if sender_profile else None
        ))
    return result


@router.get("/conversations")
async def get_conversations(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get unique conversation partners (user profiles) for current user"""
    # Get all messages where user is sender or recipient
    messages = db.query(Message).filter(
        (Message.sender_id == user.id) | (Message.recipient_id == user.id)
    ).all()
    # Collect unique user IDs of conversation partners
    partner_ids = set()
    for msg in messages:
        if msg.sender_id != user.id:
            partner_ids.add(msg.sender_id)
        if msg.recipient_id != user.id:
            partner_ids.add(msg.recipient_id)
    # Fetch profiles for these users
    partners = db.query(Profile).filter(Profile.user_id.in_(partner_ids)).all()
    result = []
    for profile in partners:
        partner_id = profile.user_id
        user_obj = db.query(User).filter(User.id == partner_id).first()
        # Find all messages between user and partner
        convo_msgs = [m for m in messages if (m.sender_id == partner_id or m.recipient_id == partner_id)]
        # Find last message (by timestamp or id)
        last_msg = None
        if convo_msgs:
            last_msg = max(convo_msgs, key=lambda m: (getattr(m, 'timestamp', None) or getattr(m, 'created_at', None) or 0, m.id))
        # Count unread messages sent to user by this partner
        unread_count = sum(1 for m in convo_msgs if m.sender_id == partner_id and m.recipient_id == user.id and not m.is_read)
        result.append({
            'id': partner_id,
            'full_name': getattr(user_obj, 'full_name', None),
            'email': getattr(user_obj, 'email', None),
            'public_key': profile.public_key,
            'role': getattr(user_obj, 'role', None),
            'last_message': {
                'id': last_msg.id if last_msg else None,
                'sender_id': last_msg.sender_id if last_msg else None,
                'recipient_id': last_msg.recipient_id if last_msg else None,
                'timestamp': str(getattr(last_msg, 'timestamp', None) or getattr(last_msg, 'created_at', None)) if last_msg else None,
                'text': last_msg.ciphertext if last_msg else None,
            } if last_msg else None,
            'unread_count': unread_count,
        })
    return result

@router.get("/with/{user_id}")
async def get_messages_with_user(
    user_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get message history with specific user"""
    messages = db.query(Message).filter(
        ((Message.sender_id == user.id) & (Message.recipient_id == user_id)) |
        ((Message.sender_id == user_id) & (Message.recipient_id == user.id))
    ).order_by(Message.created_at.desc()).all()
    result = []
    for msg in messages:
        sender_profile = db.query(Profile).filter(Profile.user_id == msg.sender_id).first()
        result.append({
            **msg.__dict__,
            'from_user_public_key': sender_profile.public_key if sender_profile else None
        })
    return result

@router.post("/send")
async def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    sender = Depends(get_current_user)
):
    """Send encrypted message (E2EE)"""
    recipient = db.query(User).filter(User.id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    message = Message(
        sender_id=sender.id,
        recipient_id=message_data.recipient_id,
        ciphertext=message_data.ciphertext  # Encrypted on client
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    # Attach sender's public key
    sender_profile = db.query(Profile).filter(Profile.user_id == sender.id).first()
    return {
        **message.__dict__,
        'from_user_public_key': sender_profile.public_key if sender_profile else None
    }

@router.put("/{message_id}/mark-read", response_model=MessageResponse)
async def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Mark message as read"""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message or message.recipient_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

