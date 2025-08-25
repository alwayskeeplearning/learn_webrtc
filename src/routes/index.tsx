import type { FC } from 'react';
import { useRoutes, BrowserRouter } from 'react-router-dom';
import routes from './config';
import { useModel } from '@enforcer-squad/rex';
import userModel from '@/store/user';
import { useSuspense } from '@/utils';

interface PropTypes {
  role: number | undefined;
}

const Routes: FC<PropTypes> = ({ role }) => {
  const routing = useRoutes(routes(role));
  return routing;
};

const Router = () => {
  const { role, check } = useModel(userModel);

  useSuspense(check, { cacheKeys: ['check'] });

  return (
    <BrowserRouter>
      <Routes role={role} />
    </BrowserRouter>
  );
};
export default Router;
