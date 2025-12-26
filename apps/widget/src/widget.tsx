import React from 'react';
import ReactDOM from 'react-dom/client';
import { CreateBookingRequest, BookingResponse } from '@shared/types/booking';

interface WidgetProps {
  apiUrl?: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
}

function Widget({
  apiUrl = 'http://localhost:3000',
  theme = 'light',
  position = 'bottom-right',
}: WidgetProps): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const themeClasses = {
    light: 'bg-white text-gray-900 border-gray-200',
    dark: 'bg-gray-800 text-white border-gray-600',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {isOpen && (
        <div
          className={`mb-4 w-80 h-96 rounded-lg shadow-lg border ${themeClasses[theme]} p-4`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">AI Booking Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="h-full">
            <p className="text-sm text-gray-600">Widget content placeholder</p>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg"
      >
        💬
      </button>
    </div>
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
    const apiUrl = script.dataset.apiUrl;
    const theme = script.dataset.theme as 'light' | 'dark';
    const position = script.dataset.position as 'bottom-right' | 'bottom-left';

    // Create container if it doesn't exist
    if (!document.getElementById(containerId)) {
      const container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    initWidget(containerId, { apiUrl, theme, position });
  }
}

export default Widget;
