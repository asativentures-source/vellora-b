"""Patient ↔ doctor messaging."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from deps import db, uid, now_iso, get_current_user

router = APIRouter(prefix="/messages")

class MessageCreate(BaseModel):
    to_user_id: str
    body: str

@router.post("")
async def send_message(m: MessageCreate, user=Depends(get_current_user)):
    recipient = await db.users.find_one({"user_id": m.to_user_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(404, "Recipient not found")
    thread_id = "thr_" + "_".join(sorted([user["user_id"], m.to_user_id]))
    doc = {
        "id": uid("msg"),
        "thread_id": thread_id,
        "from_user_id": user["user_id"],
        "from_name": user["name"],
        "from_role": user.get("role", "patient"),
        "to_user_id": m.to_user_id,
        "to_name": recipient["name"],
        "body": m.body,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/thread")
async def get_thread(with_user_id: str, user=Depends(get_current_user)):
    thread_id = "thr_" + "_".join(sorted([user["user_id"], with_user_id]))
    docs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    await db.messages.update_many(
        {"thread_id": thread_id, "to_user_id": user["user_id"], "read": False},
        {"$set": {"read": True}},
    )
    return docs

@router.get("/threads")
async def list_threads(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"from_user_id": user["user_id"]}, {"to_user_id": user["user_id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$thread_id",
            "last_message": {"$first": "$body"},
            "last_at": {"$first": "$created_at"},
            "from_name": {"$first": "$from_name"},
            "to_name": {"$first": "$to_name"},
            "from_user_id": {"$first": "$from_user_id"},
            "to_user_id": {"$first": "$to_user_id"},
        }},
        {"$sort": {"last_at": -1}},
    ]
    out = []
    async for row in db.messages.aggregate(pipeline):
        other_id = row["to_user_id"] if row["from_user_id"] == user["user_id"] else row["from_user_id"]
        other_name = row["to_name"] if row["from_user_id"] == user["user_id"] else row["from_name"]
        unread = await db.messages.count_documents(
            {"thread_id": row["_id"], "to_user_id": user["user_id"], "read": False}
        )
        out.append({
            "thread_id": row["_id"],
            "other_user_id": other_id,
            "other_name": other_name,
            "last_message": row["last_message"],
            "last_at": row["last_at"],
            "unread": unread,
        })
    return out
