import { RouterProvider } from 'react-router'
import { Routes } from './router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLoader } from './components/app-loader';
import { useAppStore } from './store';
import AlertToast from './components/app-alert/alert';
import { useEffect } from 'react';
import { GlobalAlertDialog } from './components/alert-dialog';

export function App() {
  const queryClient = new QueryClient();
  const appLoading = useAppStore().appLoader;
  const getSession = useAppStore().getSession;

  useEffect(() => {
    getSession();
  }, [getSession]);

  return (
    <>
      <AlertToast />
      <GlobalAlertDialog />
      <QueryClientProvider client={queryClient}>
        <div className='relative w-full h-full'>
          <AppLoader loading={appLoading}>
            <RouterProvider router={Routes} />
          </AppLoader>
        </div>
      </QueryClientProvider>
    </>

  )
}

export default App
