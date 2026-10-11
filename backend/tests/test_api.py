def test_health(client):
    assert client.get("/health").json() == {"status": "UP"}


def test_ready_checks_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "READY"}


def test_root(client):
    assert client.get("/").json()["service"] == "HelpDesk API"


def test_create_ticket(client):
    response = client.post(
        "/api/tickets",
        json={"title": "Refund not received", "requester_email": "ravi@example.com", "category": "BILLING"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["status"] == "OPEN"
    assert body["priority"] == "MEDIUM"


def test_create_ticket_rejects_bad_email(client):
    response = client.post("/api/tickets", json={"title": "Printer jam", "requester_email": "not-an-email"})
    assert response.status_code == 422


def test_create_ticket_rejects_unknown_priority(client):
    response = client.post(
        "/api/tickets", json={"title": "Printer jam", "requester_email": "a@example.com", "priority": "PANIC"}
    )
    assert response.status_code == 422


def test_list_and_filter_tickets(client, ticket):
    client.post("/api/tickets", json={"title": "Low prio question", "requester_email": "b@example.com", "priority": "LOW"})
    assert len(client.get("/api/tickets").json()) == 2
    urgent = client.get("/api/tickets", params={"priority": "URGENT"}).json()
    assert [t["id"] for t in urgent] == [ticket["id"]]


def test_get_ticket(client, ticket):
    response = client.get(f"/api/tickets/{ticket['id']}")
    assert response.status_code == 200
    assert response.json()["title"] == "Cannot log in to portal"


def test_get_missing_ticket_returns_404(client):
    assert client.get("/api/tickets/9999").status_code == 404


def test_update_ticket(client, ticket):
    response = client.put(f"/api/tickets/{ticket['id']}", json={"status": "RESOLVED", "assignee": "Neha"})
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"
    assert response.json()["assignee"] == "Neha"


def test_delete_ticket(client, ticket):
    assert client.delete(f"/api/tickets/{ticket['id']}").status_code == 204
    assert client.get(f"/api/tickets/{ticket['id']}").status_code == 404


def test_stats(client, ticket):
    client.post("/api/tickets", json={"title": "Second issue", "requester_email": "c@example.com", "status": "RESOLVED"})
    stats = client.get("/api/tickets/stats").json()
    assert stats == {"total": 2, "open": 1, "in_progress": 0, "resolved": 1, "closed": 0, "urgent_open": 1}


def test_metrics_endpoint(client):
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
