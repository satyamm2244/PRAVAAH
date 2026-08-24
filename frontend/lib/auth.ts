const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "pravaah_access_token";
const USER_KEY = "pravaah_user";


/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type UserRole = "USER" | "OFFICER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: number;
  lastLoginAt: number | null;
};

type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};


/* -------------------------------------------------------------------------- */
/* STORAGE                                                                    */
/* -------------------------------------------------------------------------- */

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}


export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}


function saveSession(
  token: string,
  user: AuthUser
) {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}


/* -------------------------------------------------------------------------- */
/* LOGIN                                                                      */
/* -------------------------------------------------------------------------- */

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {

  const body = new URLSearchParams();

  body.append("email", email);
  body.append("password", password);

  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to login."
    );
  }

  saveSession(
    data.accessToken,
    data.user
  );

  return data;
}


/* -------------------------------------------------------------------------- */
/* REGISTER                                                                   */
/* -------------------------------------------------------------------------- */

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {

  const body = new URLSearchParams();

  body.append("name", name);
  body.append("email", email);
  body.append("password", password);

  const response = await fetch(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to create account."
    );
  }

  saveSession(
    data.accessToken,
    data.user
  );

  return data;
}


/* -------------------------------------------------------------------------- */
/* CURRENT USER                                                               */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser(): Promise<AuthUser> {

  const token = getToken();

  if (!token) {
    throw new Error(
      "Not authenticated."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },

      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    logout();

    throw new Error(
      data.detail ||
        "Authentication expired."
    );
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(data.user)
  );

  return data.user;
}


/* -------------------------------------------------------------------------- */
/* LOGOUT                                                                     */
/* -------------------------------------------------------------------------- */

export function logout() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );
}


/* -------------------------------------------------------------------------- */
/* ROLE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

export function isOfficer(): boolean {
  const user = getStoredUser();

  return user?.role === "OFFICER";
}


export function isUser(): boolean {
  const user = getStoredUser();

  return user?.role === "USER";
}


export function isAuthenticated(): boolean {
  return Boolean(
    getToken()
  );
}


/* -------------------------------------------------------------------------- */
/* AUTHENTICATED FETCH                                                        */
/* -------------------------------------------------------------------------- */

export async function authFetch(
  url: string,
  options: RequestInit = {}
) {

  const token = getToken();

  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }

  const headers = new Headers(
    options.headers
  );

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  return fetch(
    url,
    {
      ...options,
      headers,
    }
  );
}