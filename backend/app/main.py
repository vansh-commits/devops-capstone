from fastapi import Depends, FastAPI, HTTPException, Query, status
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Ticket
from .schemas import Priority, StatsOut, Status, TicketCreate, TicketOut, TicketUpdate

app = FastAPI(title=settings.app_name, version=settings.app_version)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


def get_ticket_or_404(ticket_id: int, db: Session) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.get("/")
def root():
    return {"service": settings.app_name, "version": settings.app_version, "docs": "/docs"}


@app.get("/health")
def health():
    """Liveness: the process is up."""
    return {"status": "UP"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness: the database is reachable, so we can serve traffic."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Database not reachable")
    return {"status": "READY"}


@app.get("/api/tickets", response_model=list[TicketOut])
def list_tickets(
    status_filter: Status | None = Query(default=None, alias="status"),
    priority: Priority | None = None,
    db: Session = Depends(get_db),
):
    query = select(Ticket).order_by(Ticket.id.desc())
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if priority:
        query = query.where(Ticket.priority == priority)
    return list(db.scalars(query))


@app.get("/api/tickets/stats", response_model=StatsOut)
def ticket_stats(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)).all())
    urgent_open = db.scalar(
        select(func.count(Ticket.id)).where(Ticket.priority == "URGENT", Ticket.status.in_(["OPEN", "IN_PROGRESS"]))
    )
    return StatsOut(
        total=sum(counts.values()),
        open=counts.get("OPEN", 0),
        in_progress=counts.get("IN_PROGRESS", 0),
        resolved=counts.get("RESOLVED", 0),
        closed=counts.get("CLOSED", 0),
        urgent_open=urgent_open or 0,
    )


@app.get("/api/tickets/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return get_ticket_or_404(ticket_id, db)


@app.post("/api/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.put("/api/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: int, payload: TicketUpdate, db: Session = Depends(get_db)):
    ticket = get_ticket_or_404(ticket_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/api/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db.delete(get_ticket_or_404(ticket_id, db))
    db.commit()
