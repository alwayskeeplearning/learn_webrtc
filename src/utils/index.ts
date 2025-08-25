import client from './client';

const intl = (key: string, options?: Record<string, string | number>) => {
  const i18nKey = window.tx_language?.[key] || key;
  if (options) {
    return Object.entries(options).reduce((result, [k, v]) => {
      const reg = new RegExp(`{{${k}}}`, 'g');
      return result.replace(reg, String(v));
    }, i18nKey);
  }
  return i18nKey;
};

const cache = new Map();
interface Options {
  cacheKeys: any[];
  params?: any[];
}

const useSuspense = (fn: (...args: any[]) => Promise<void>, options: Options) => {
  const cacheKeyStr = options.cacheKeys.join('-');
  if (cache.has(cacheKeyStr)) {
    const promise = cache.get(cacheKeyStr);
    if (promise.status === 'fulfilled') {
      return promise.value;
    } else if (promise.status === 'rejected') {
      throw promise.reason;
    } else if (promise.status === 'pending') {
      throw promise;
    }
  } else {
    const promise = fn(...(options.params || [])) as any;
    promise.status = 'pending';
    console.log('promise', promise);
    promise.then(
      () => {
        promise.status = 'fulfilled';
      },
      (reason: any) => {
        promise.status = 'rejected';
        promise.reason = reason;
      },
    );
    cache.set(cacheKeyStr, promise);
    throw promise;
  }
};

export { client, intl, useSuspense };
