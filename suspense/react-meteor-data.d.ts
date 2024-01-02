// Suspense
import type * as React from 'react'

export function useTracker<TDataProps>(
  key: string,
  reactiveFn: () => Promise<TDataProps>
): TDataProps
export function useTracker<TDataProps>(
  key: string,
  reactiveFn: () => Promise<TDataProps>,
  deps: React.DependencyList
): TDataProps
export function useTracker<TDataProps>(
  key: string,
  getMeteorData: () => Promise<TDataProps>,
  deps: React.DependencyList,
  skipUpdate?: (prev: Promise<TDataProps>, next: Promise<TDataProps>) => boolean
): TDataProps
export function useTracker<TDataProps>(
  key: string,
  getMeteorData: () => Promise<TDataProps>,
  skipUpdate: (prev: Promise<TDataProps>, next: Promise<TDataProps>) => boolean
): TDataProps
