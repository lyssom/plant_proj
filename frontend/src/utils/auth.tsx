// utils/auth.ts
export function saveToken(token: string) {
  localStorage.setItem("jwt_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("jwt_token");
}

export function removeToken() {
  localStorage.removeItem("jwt_token");
}

// 可以从 JWT 里解析用户名，也可以直接后端返回
export function saveUser(username: string) {
  localStorage.setItem("username", username);
}

export function getUser(): string | null {
    console.log(66666)
    console.log(localStorage.getItem("username"));
    console.log(66666111)
  return localStorage.getItem("username");
}

export function removeUser() {
  localStorage.removeItem("username");
}
