from app.main import Event, classify, failures

def test_suspicious_request():
    event = Event(source_ip='203.0.113.1', event_type='request', path='/../../etc/passwd')
    assert classify(event) == ('suspicious_request', 'medium')

def test_failed_logins():
    failures.clear()
    event = Event(source_ip='203.0.113.2', event_type='login_failed')
    for _ in range(4):
        assert classify(event) is None
    assert classify(event) == ('brute_force_suspected', 'high')
