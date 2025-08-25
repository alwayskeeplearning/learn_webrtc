import { client } from '@/utils';
import type { LoginParams, User } from '@/services/types/user';

const login = (params: LoginParams): Promise<User> =>
  client({
    url: `/v1/user/login`,
    method: 'post',
    data: params,
  });

const checkLogin = (): Promise<User> => {
  // return client({
  //   url: `/v1/user/checkLogin`,
  //   method: 'get',
  // });
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ name: 'admin', role: 1, status: 1, userId: 1, isFirstLogin: 1 });
    }, 1000);
  });
};

const logout = () =>
  client({
    url: `/v1/user/logout`,
    method: 'get',
  });

export { login, checkLogin, logout };
