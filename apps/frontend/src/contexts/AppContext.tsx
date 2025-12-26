import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { BookingResponse, ConversationContext } from '@ai-booking/shared';

interface AppState {
  bookings: BookingResponse[];
  currentBooking: BookingResponse | null;
  conversationContext: ConversationContext | null;
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOOKINGS'; payload: BookingResponse[] }
  | { type: 'ADD_BOOKING'; payload: BookingResponse }
  | { type: 'UPDATE_BOOKING'; payload: BookingResponse }
  | { type: 'SET_CURRENT_BOOKING'; payload: BookingResponse | null }
  | { type: 'SET_CONVERSATION_CONTEXT'; payload: ConversationContext | null };

const initialState: AppState = {
  bookings: [],
  currentBooking: null,
  conversationContext: null,
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [...state.bookings, action.payload],
        currentBooking: action.payload,
      };
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map((booking) =>
          booking.id === action.payload.id ? action.payload : booking
        ),
        currentBooking:
          state.currentBooking?.id === action.payload.id
            ? action.payload
            : state.currentBooking,
      };
    case 'SET_CURRENT_BOOKING':
      return { ...state, currentBooking: action.payload };
    case 'SET_CONVERSATION_CONTEXT':
      return { ...state, conversationContext: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
