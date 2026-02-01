"""
Service functions for CRUD operations on Message model.
"""

from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageRead


async def create_message(
    session: AsyncSession, message_data: MessageCreate
) -> Message:
    """
    Create a new chat message.

    Args:
        session: Async SQLAlchemy session.
        message_data: MessageCreate schema with input data.

    Returns:
        Created Message instance.
    """
    new_message = Message(**message_data.dict())
    session.add(new_message)
    await session.commit()
    await session.refresh(new_message)
    return new_message


async def get_message(session: AsyncSession, message_id: int) -> Message:
    """
    Retrieve a message by ID.

    Args:
        session: Async SQLAlchemy session.
        message_id: ID of the message to retrieve.

    Raises:
        NoResultFound if message not found.

    Returns:
        Message instance.
    """
    result = await session.execute(select(Message).where(Message.id == message_id))
    message = result.scalars().first()
    if not message:
        raise NoResultFound
    return message


async def list_messages_by_order(
    session: AsyncSession, order_id: int, skip: int = 0, limit: int = 50
) -> List[Message]:
    """
    List messages for a specific care order, paginated.

    Args:
        session: Async SQLAlchemy session.
        order_id: ID of the care order.
        skip: Number of records to skip.
        limit: Max number of records to return.

    Returns:
        List of Message instances.
    """
    result = await session.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
