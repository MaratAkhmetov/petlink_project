"""
API routes for chat messages related to care orders.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import NoResultFound
from sqlalchemy import delete
from typing import List

from app.db.database import get_db_session
from app.schemas.message import MessageCreate, MessageRead
from app.services.chat_service import create_message, get_message, list_messages_by_order
from app.api.auth import get_current_user
from app.models.user import User
from app.models.message import Message

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def create_new_message(
    message_data: MessageCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new message in chat.

    The sender_id in the request must match the current authenticated user.
    """
    # Set sender_id explicitly from current user
    message_data.sender_id = current_user.id

    new_message = await create_message(session, message_data)
    return new_message


@router.get("/{message_id}", response_model=MessageRead)
async def read_message(
    message_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieve a message by ID.
    """
    try:
        message = await get_message(session, message_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.get("/", response_model=List[MessageRead])
async def read_messages_for_order(
    order_id: int = Query(..., description="ID of the care order"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    """
    List messages for a specific care order, paginated.
    """
    messages = await list_messages_by_order(session, order_id, skip=skip, limit=limit)
    return messages


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_messages_for_order(
    order_id: int = Query(..., description="ID of the care order"),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete all messages for a given care order.

    Used before deleting the care order to avoid constraint errors.
    """
    await session.execute(
        delete(Message).where(Message.order_id == order_id)
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_by_id(
    message_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a single message by ID. Only sender can delete their message.
    """
    result = await session.execute(
        delete(Message).where(Message.id == message_id, Message.sender_id == current_user.id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Message not found or access denied")

    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
