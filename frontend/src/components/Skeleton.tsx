import React from 'react';

/**
 * Generic loading skeleton component for cards
 */
export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
    </div>
  );
}

/**
 * Loading skeleton for student cards
 */
export function StudentCardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-12 w-12"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
    </div>
  );
}

/**
 * Loading skeleton for table rows
 */
export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
      </td>
    </tr>
  );
}

/**
 * Generic page loading component
 */
export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

/**
 * Loading fallback component for Suspense
 */
export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
        </div>
        <p className="mt-4 text-lg text-[var(--text-primary)]">Loading...</p>
      </div>
    </div>
  );
}
