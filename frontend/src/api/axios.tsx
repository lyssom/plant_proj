import axios from "axios"

const baseUrl = "http://localhost:5000"

class HttpRequest {
  baseUrl: string;
  headers: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {};
  }

  getAuth() {
    if (localStorage.getItem("token") != null) {
      this.headers = {
        "Authorization": localStorage.getItem("token") as string
      };
    }
  }

  getInsideConfig() {
    this.getAuth();
    const config = {
      baseURL: this.baseUrl,
      headers: this.headers
    };
    return config;
  }

//   interceptors(instance: any) {
//     instance.interceptors.request.use(
//       function (config: any) {
//         return config;
//       },
//       function (error: any) {
//         return Promise.reject(error);
//       }
//     );

//     instance.interceptors.response.use(
//       function (response: any) {
//         return response;
//       },
//       function (error: any) {
//         const status = error.response?.status;

//         if (status === 404) {
//           message.error("接口不存在");
//         } else if (status === 403 || status === 401) {
//           message.error("无权限，请重新登录");
//           localStorage.removeItem("token");
//           window.location.href = "/login";
//         } else {
//           message.error(error.response?.data?.msg || "服务器错误");
//         }

//         return Promise.reject(error);
//       }
//     );
//   }

  request(options: any) {
    options = { ...this.getInsideConfig(), ...options };
    const instance = axios.create();
    // this.interceptors(instance);
    return instance(options);
  }
}


export default new HttpRequest(baseUrl)