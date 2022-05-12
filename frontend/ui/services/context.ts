import React, { createContext } from 'react';

type IContext = {
  accountIdentifier: string | null,
  principal: string | null,
  login: (wallet: 'plug' | 'stoic') => Promise<boolean>,
  anonymousLogin: () => void,
  logout: () => void,
}

export const Context = createContext<IContext>({
  accountIdentifier: null,
  principal: null,
  login: (wallet: 'plug' | 'stoic') => {return new Promise((e) => {
    e(false)
  })},
  anonymousLogin: () => {},
  logout: () => {},
});
