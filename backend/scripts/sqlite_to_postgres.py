import sqlite3
import psycopg2
import pandas as pd
import os

# Paths and connection info
SQLITE_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), '../fcs.db'))
PG_CONN = {
    'dbname': 'fcs',
    'user': 'fcsuser',
    'password': 'fcspassword',
    'host': 'localhost',
    'port': 5432
}

def get_sqlite_tables(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    return [row[0] for row in cursor.fetchall()]

def transfer_table(table, sqlite_conn, pg_conn):
    df = pd.read_sql_query(f'SELECT * FROM {table}', sqlite_conn)
    if df.empty:
        print(f"Skipping {table}: no data.")
        return
    # Convert integer 1/0 to boolean True/False for known boolean columns
    bool_columns = {
        'users': ['is_active', 'is_verified', 'profile_verified'],
        'otp_logs': ['is_used'],
        'profiles': ['is_public'],
    }
    if table in bool_columns:
        for col in bool_columns[table]:
            if col in df.columns:
                df[col] = df[col].apply(lambda x: True if x == 1 else False if x == 0 else None)
    # Convert user role to uppercase for enum compatibility
    if table == 'users' and 'role' in df.columns:
        df['role'] = df['role'].str.upper()
    cols = ','.join(df.columns)
    vals = ','.join(['%s'] * len(df.columns))
    insert_sql = f'INSERT INTO {table} ({cols}) VALUES ({vals})'
    with pg_conn.cursor() as cur:
        for row in df.itertuples(index=False, name=None):
            try:
                cur.execute(insert_sql, row)
            except Exception as e:
                print(f"Error inserting into {table}: {e}")
    pg_conn.commit()
    print(f"Transferred {len(df)} rows to {table}.")

def main():
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    pg_conn = psycopg2.connect(**PG_CONN)
    tables = get_sqlite_tables(sqlite_conn)
    for table in tables:
        transfer_table(table, sqlite_conn, pg_conn)
    sqlite_conn.close()
    pg_conn.close()
    print("Data transfer complete.")

if __name__ == "__main__":
    main()
