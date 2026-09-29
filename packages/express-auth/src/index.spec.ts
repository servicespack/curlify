import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authorize } from './index';

describe('authorize middleware', () => {
  const createMockReq = (headers: Record<string, string> = {}): Partial<Request> => ({
    headers,
  });

  const createMockRes = (): Partial<Response> => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const createMockNext = (): NextFunction => vi.fn() as unknown as NextFunction;

  it('should call next and set req.auth with default Bearer scheme and no validation', async () => {
    const middleware = authorize();
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBe('my-token');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should call next and set req.auth when validate function returns true', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const middleware = authorize({ validate });
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(validate).toHaveBeenCalledWith('my-token', req);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBe('my-token');
  });

  it('should call next and set req.auth to the validation payload when validate returns custom object', async () => {
    const payload = { userId: '123', role: 'admin' };
    const validate = vi.fn().mockResolvedValue(payload);
    const middleware = authorize({ validate });
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(validate).toHaveBeenCalledWith('my-token', req);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toEqual(payload);
  });

  it('should return 401 when Authorization header is missing', async () => {
    const middleware = authorize();
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing Authorization header' });
  });

  it('should return 401 when Authorization format is invalid', async () => {
    const middleware = authorize();
    const req = createMockReq({ authorization: 'Bearer-token-no-space' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Format is Authorization: <scheme> <token>' });
  });

  it('should return 401 when scheme is incorrect', async () => {
    const middleware = authorize();
    const req = createMockReq({ authorization: 'Basic credentials' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expected Bearer scheme' });
  });

  it('should allow custom case-insensitive schemes', async () => {
    const middleware = authorize({ scheme: 'ApiKey' });
    const req = createMockReq({ authorization: 'apikey my-key' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBe('my-key');
  });

  it('should return 401 when token is missing', async () => {
    const middleware = authorize();
    // Two parts but token is empty string (though split(' ') on 'Bearer ' gives ['Bearer', ''])
    const req = createMockReq({ authorization: 'Bearer ' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing token' });
  });

  it('should return 401 and custom message when validate function returns false', async () => {
    const validate = vi.fn().mockResolvedValue(false);
    const middleware = authorize({ validate });
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(validate).toHaveBeenCalledWith('my-token', req);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
  });

  it('should return 401 and custom error message when validate function throws', async () => {
    const validate = vi.fn().mockRejectedValue(new Error('Expired token'));
    const middleware = authorize({ validate });
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expired token' });
  });

  it('should return 401 and fallback error message when validate function throws a falsy value', async () => {
    const validate = vi.fn().mockRejectedValue(null);
    const middleware = authorize({ validate });
    const req = createMockReq({ authorization: 'Bearer my-token' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token validation failed' });
  });

  it('should handle multiple spaces and trim whitespace in the Authorization header', async () => {
    const middleware = authorize();
    const req = createMockReq({ authorization: '  Bearer    my-token  ' });
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBe('my-token');
  });

  it('should call custom unauthorized handler if provided', async () => {
    const unauthorized = vi.fn();
    const middleware = authorize({ unauthorized });
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(unauthorized).toHaveBeenCalledWith(req, res, next, 'Missing Authorization header');
  });
});
