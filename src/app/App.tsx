import { MotionConfig } from 'motion/react';
import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/app/Layout';
import { TimerScreen } from '@/app/TimerScreen';
import { useTheme } from '@/features/settings/useTheme';
import { useTimerRuntime } from '@/features/timer/runtime';
import { EmptyState } from '@/ui/EmptyState';

const StatsPage = lazy(() => import('@/features/stats/ui/StatsPage'));
const SubjectsPage = lazy(() => import('@/features/subjects/ui/SubjectsPage'));
const AchievementsPage = lazy(() => import('@/features/achievements/ui/AchievementsPage'));
const SettingsPage = lazy(() => import('@/features/settings/ui/SettingsPage'));

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <TimerScreen /> },
        { path: 'stats', element: <StatsPage /> },
        { path: 'subjects', element: <SubjectsPage /> },
        { path: 'achievements', element: <AchievementsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        {
          path: '*',
          element: (
            <EmptyState
              art="search"
              title="Такой страницы нет"
              text="Возможно, ссылка устарела. Таймер на месте."
              action={{ label: 'К таймеру', to: '/' }}
            />
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

export function App() {
  useTimerRuntime();
  useTheme();
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
