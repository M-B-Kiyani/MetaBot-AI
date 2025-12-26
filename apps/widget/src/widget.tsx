import React from 'react';
import ReactDOM from 'react-dom/client';
import { BookingResponse } from '@ai-booking/shared';
import { BookingModal } from './components/BookingModal';
import { ChatInterface } from './components/ChatInterface';

interface WidgetProps {
  apiUrl?: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
}

function Widget({
  apiUrl = 'http://localhost:3000',
  theme = 'light',
  position = 'bottom-right',
}: WidgetProps): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showBookingModal, setShowBookingModal] = React.useState(false);
  const [lastBooking, setLastBooking] = React.useState<BookingResponse | null>(
    null
  );

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const themeClasses = {
    light: 'bg-white text-gray-900 border-gray-200',
    dark: 'bg-gray-800 text-white border-gray-600',
  };

  const handleBookingComplete = (booking: BookingResponse) => {
    setLastBooking(booking);
    setShowBookingModal(false);
    // Show a success message or update the chat
  };

  const handleBookingRequest = () => {
    setShowBookingModal(true);
  };

  return (
    <>
      <div className={`fixed ${positionClasses[position]} z-50`}>
        {isOpen && (
          <div
            className={`mb-4 w-80 h-96 rounded-lg shadow-lg border ${themeClasses[theme]} flex flex-col`}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold">AI Booking Assistant</h3>
                <p className="text-xs text-gray-500">
                  {lastBooking
                    ? `Last booking: ${lastBooking.id.slice(-8)}`
                    : 'Ready to help you book'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                apiUrl={apiUrl}
                onBookingRequest={handleBookingRequest}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors"
        >
          💬
        </button>
      </div>

      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onBookingComplete={handleBookingComplete}
        apiUrl={apiUrl}
      />
    </>
  );
}

// Widget initialization function
export function initWidget(containerId: string, props: WidgetProps = {}): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const root = ReactDOM.createRoot(container);
  root.render(<Widget {...props} />);
}

// Auto-initialize if script tag has data attributes
if (typeof window !== 'undefined') {
  const script = document.currentScript as HTMLScriptElement;
  if (script?.dataset.autoInit === 'true') {
    const containerId = script.dataset.containerId || 'ai-booking-widget';
    const apiUrl = script.dataset.apiUrl || undefined;
    const theme = (script.dataset.theme as 'light' | 'dark') || undefined;
    const position =
      (script.dataset.position as 'bottom-right' | 'bottom-left') || undefined;

    // Create container if it doesn't exist
    if (!document.getElementById(containerId)) {
      const container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    initWidget(containerId, {
      ...(apiUrl && { apiUrl }),
      ...(theme && { theme }),
      ...(position && { position }),
    });
  }
}

export default Widget;
