import { Hono } from 'hono';
import { Env, UserPayload } from '../types';
import { hashPassword, verifyPassword, generateJwt, verifyJwt } from '../services/auth';
import { sendOtpEmail } from '../services/email';

const authRouter = new Hono<{ Bindings: Env }>();

// Helper to extract bearer token
export async function getAuthenticatedUser(c: any): Promise<UserPayload | null> {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const secret = c.env.JWT_SECRET || 'shipfast-secret-key-shipfast-key-change-in-production';
  return verifyJwt(token, secret);
}

// Register
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password, role, phone, department, address } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, message: 'Name, email and password are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first();
    if (existing) {
      return c.json({ success: false, message: 'User with this email already exists' }, 400);
    }

    const hashed = await hashPassword(password);
    const assignedRole = role ? String(role).toUpperCase() : 'CUSTOMER';

    const insertResult = await c.env.DB.prepare(
      `INSERT INTO users (name, email, password, role, phone, department, address, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(name, cleanEmail, hashed, assignedRole, phone || '', department || '', address || '').run();

    const userId = Number(insertResult.meta?.last_row_id || 1);
    const secret = c.env.JWT_SECRET || 'shipfast-secret-key-shipfast-key-change-in-production';
    const payload: UserPayload = { id: userId, email: cleanEmail, role: assignedRole, name };
    const accessToken = await generateJwt(payload, secret, 86400);
    const refreshToken = await generateJwt(payload, secret, 86400 * 7);

    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user: {
          id: userId,
          name,
          email: cleanEmail,
          role: assignedRole,
          phone,
          status: 'ACTIVE'
        }
      }
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Registration failed' }, 500);
  }
});

// Login
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, message: 'Email and password are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user: any = await c.env.DB.prepare(
      'SELECT id, name, email, password, role, status, phone, department, avatar_url, address FROM users WHERE email = ?'
    ).bind(cleanEmail).first();

    if (!user) {
      return c.json({ success: false, message: 'Invalid email or password' }, 401);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return c.json({ success: false, message: 'Invalid email or password' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'shipfast-secret-key-shipfast-key-change-in-production';
    const payload: UserPayload = { id: user.id, email: user.email, role: user.role || 'CUSTOMER', name: user.name };
    const accessToken = await generateJwt(payload, secret, 86400);
    const refreshToken = await generateJwt(payload, secret, 86400 * 7);

    return c.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        department: user.department,
        avatarUrl: user.avatar_url,
        address: user.address
      }
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Login failed' }, 500);
  }
});

// Refresh Token
authRouter.post('/refresh-token', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;
    if (!refreshToken) {
      return c.json({ success: false, message: 'Refresh token required' }, 400);
    }

    const secret = c.env.JWT_SECRET || 'shipfast-secret-key-shipfast-key-change-in-production';
    const decoded = await verifyJwt(refreshToken, secret);
    if (!decoded) {
      return c.json({ success: false, message: 'Invalid or expired refresh token' }, 401);
    }

    const newAccessToken = await generateJwt(decoded, secret, 86400);
    return c.json({
      success: true,
      accessToken: newAccessToken,
      token: newAccessToken
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Profile - Get
authRouter.get('/profile', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const dbUser: any = await c.env.DB.prepare(
    'SELECT id, name, email, role, status, phone, department, avatar_url, address, created_at FROM users WHERE id = ?'
  ).bind(user.id).first();

  if (!dbUser) {
    return c.json({ success: false, message: 'User not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      phone: dbUser.phone,
      department: dbUser.department,
      avatarUrl: dbUser.avatar_url,
      address: dbUser.address,
      createdAt: dbUser.created_at
    }
  });
});

// Profile - Update
authRouter.put('/profile', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { name, phone, department, address, avatarUrl } = body;

  await c.env.DB.prepare(
    `UPDATE users 
     SET name = COALESCE(?, name), 
         phone = COALESCE(?, phone), 
         department = COALESCE(?, department), 
         address = COALESCE(?, address),
         avatar_url = COALESCE(?, avatar_url),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(name || null, phone || null, department || null, address || null, avatarUrl || null, user.id).run();

  const updated: any = await c.env.DB.prepare(
    'SELECT id, name, email, role, status, phone, department, avatar_url, address FROM users WHERE id = ?'
  ).bind(user.id).first();

  return c.json({
    success: true,
    message: 'Profile updated successfully',
    data: updated
  });
});

// Forgot Password (sends OTP via Email)
authRouter.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ success: false, message: 'Email is required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first();
    if (!user) {
      // Return success for security obfuscation or inform user
      return c.json({ success: true, message: 'If an account exists with this email, an OTP has been dispatched.' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store in password_resets
    await c.env.DB.prepare('DELETE FROM password_resets WHERE email = ?').bind(cleanEmail).run();
    await c.env.DB.prepare(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)'
    ).bind(cleanEmail, otp, expiresAt).run();

    // Dispatch email
    await sendOtpEmail(c.env, cleanEmail, otp);

    return c.json({
      success: true,
      message: 'Verification OTP has been sent to your email.'
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Verify OTP
authRouter.post('/verify-otp', async (c) => {
  try {
    const body = await c.req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return c.json({ success: false, message: 'Email and OTP are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record: any = await c.env.DB.prepare(
      'SELECT id, otp, expires_at FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1'
    ).bind(cleanEmail).first();

    if (!record) {
      return c.json({ success: false, message: 'No OTP request found for this email' }, 400);
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return c.json({ success: false, message: 'OTP has expired. Please request a new one.' }, 400);
    }

    if (record.otp !== cleanOtp) {
      return c.json({ success: false, message: 'Invalid OTP code' }, 400);
    }

    return c.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Reset Password
authRouter.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email, newPassword, password } = body;
    const finalPassword = newPassword || password;

    if (!email || !finalPassword) {
      return c.json({ success: false, message: 'Email and new password are required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const hashed = await hashPassword(finalPassword);

    await c.env.DB.prepare(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?'
    ).bind(hashed, cleanEmail).run();

    await c.env.DB.prepare('DELETE FROM password_resets WHERE email = ?').bind(cleanEmail).run();

    return c.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new credentials.'
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Logout
authRouter.post('/logout', async (c) => {
  return c.json({ success: true, message: 'Logged out successfully' });
});

// Admin: Get all users
authRouter.get('/admin/users', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin access required' }, 403);
  }

  const result = await c.env.DB.prepare(
    'SELECT id, name, email, role, status, phone, department, created_at FROM users ORDER BY id DESC'
  ).all();

  return c.json({
    success: true,
    data: result.results || []
  });
});

// Admin: Update user role
authRouter.put('/admin/users/:id/role', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin access required' }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json();
  const { role } = body;

  await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(role, id).run();

  return c.json({
    success: true,
    message: `User role updated to ${role}`
  });
});

// Admin: Delete user
authRouter.delete('/admin/users/:id', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin access required' }, 403);
  }

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

  return c.json({
    success: true,
    message: 'User deleted successfully'
  });
});

export default authRouter;
