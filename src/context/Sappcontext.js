'use client'
import { useUser } from '@clerk/nextjs';
import { createContext, useContext, useEffect, useState } from 'react';

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext)
}

export const AppContextProvider = (props) => {
    const { user } = useUser()
    const [appUser, setAppUser] = useState(null);

    useEffect(() => {
        if (user) {
          setAppUser(user);
        } else {
          setAppUser(null);
        }
      }, [user]);

    return (
        <AppContext.Provider value={{ user: appUser }}>
            {props.children}
        </AppContext.Provider>
    )
}