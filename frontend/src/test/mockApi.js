import { AxiosError } from 'axios';
import axiosInstance from '../api/axiosInstance';

/**
 * Giả lập server cho axiosInstance (không gọi mạng thật). Interceptor vẫn chạy như thật.
 * routes: { 'POST /auth/login': (config) => ({ status: 200, data: {...} }) }
 * Handler có thể trả { networkError: true } để giả lập mất mạng.
 * Trả về mảng các request đã gọi để test kiểm tra.
 */
export function mockApi(routes) {
  const calls = [];

  axiosInstance.defaults.adapter = async (config) => {
    const key = `${config.method.toUpperCase()} ${config.url}`;
    calls.push({
      key,
      headers: config.headers,
      body: config.data ? JSON.parse(config.data) : undefined,
    });

    const handler = routes[key];
    if (!handler) throw new Error(`Test chưa giả lập request: ${key}`);

    const result = await handler(config);
    if (result?.networkError) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }

    const response = {
      data: result.data,
      status: result.status ?? 200,
      statusText: '',
      headers: {},
      config,
      request: {},
    };
    if (response.status >= 400) {
      throw new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, null, response);
    }
    return response;
  };

  return calls;
}
