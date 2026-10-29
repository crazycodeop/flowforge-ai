from app.workers.tasks import ping_task


def test_ping_task_direct_execution():
    result = ping_task("heartbeat-test")
    assert result == {"status": "ok", "response": "heartbeat-test"}


def test_celery_task_apply():
    # Eager/local execution through Celery task apply
    task_res = ping_task.apply(args=["eager-heartbeat"])
    assert task_res.successful()
    assert task_res.result == {"status": "ok", "response": "eager-heartbeat"}
