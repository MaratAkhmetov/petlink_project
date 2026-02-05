"""API routes for managing care orders."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import NoResultFound

from app.db.database import get_db_session
from app.schemas.care_order import (
    CareOrderCreate,
    CareOrderRead,
    CareOrderUpdate,
)
from app.services.care_order_service import (
    create_care_order,
    get_care_order,
    list_care_orders,
    update_care_order,
    delete_care_order,
)
from app.api.auth import get_current_user  # assuming you have this dependency
from app.models.user import User

router = APIRouter(prefix="/care_orders", tags=["Care Orders"])


@router.post("/", response_model=CareOrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: CareOrderCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new care order for the authenticated user.
    """
    new_order = await create_care_order(session, current_user.id, order_data)
    return new_order


@router.get("/{order_id}", response_model=CareOrderRead)
async def read_order(
    order_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieve a care order by its ID.
    """
    try:
        order = await get_care_order(session, order_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Care order not found")
    return order


@router.get("/", response_model=list[CareOrderRead])
async def read_orders(
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
    order_by: str = "asc",

    date_from: str | None = None,
    date_to: str | None = None,

    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    start_from = datetime.fromisoformat(date_from) if date_from else None
    start_to = datetime.fromisoformat(date_to) if date_to else None

    orders = await list_care_orders(
        session,
        current_user,
        skip=skip,
        limit=limit,
        status_filter=status,
        order_by_date=order_by,
        start_date_from=start_from,
        start_date_to=start_to,
    )
    return orders


@router.patch("/{order_id}", response_model=CareOrderRead)
async def update_order(
    order_id: int,
    order_data: CareOrderUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    updated_order = await update_care_order(session, order_id, current_user, order_data)
    return updated_order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    await delete_care_order(session, order_id, current_user)
    return
