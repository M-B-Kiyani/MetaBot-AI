import React, { useState } from 'react';
import { CreateBookingRequest, BookingDurations } from '@ai-booking/shared';
import {
  Button,
  Input,
  Select,
  DateTimePicker,
  Card,
  CardHeader,
  CardContent,
} from './ui';
import { useBookings } from '../hooks/useBookings';

interface BookingFormProps {
  onSuccess?: (booking: any) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  startTime: string;
  duration: number;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  inquiry?: string;
  startTime?: string;
  duration?: string;
  availability?: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { createBooking, checkAvailability, loading, error } = useBookings();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    inquiry: '',
    startTime: '',
    duration: 30,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const durationOptions = BookingDurations.map((duration) => ({
    value: duration,
    label: `${duration} minutes`,
  }));

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Please select a date and time';
    } else {
      const selectedDate = new Date(formData.startTime);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.startTime = 'Please select a future date and time';
      }
    }

    if (!formData.duration) {
      newErrors.duration = 'Please select a duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleInputChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        field === 'duration' ? Number(e.target.value) : e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        clearError(field);
      }

      // Reset availability check when time or duration changes
      if (field === 'startTime' || field === 'duration') {
        setAvailabilityChecked(false);
        clearError('availability');
      }
    };

  const handleDateTimeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, startTime: value }));
    setAvailabilityChecked(false);
    clearError('startTime');
    clearError('availability');
  };

  const handleCheckAvailability = async () => {
    if (!formData.startTime || !formData.duration) {
      setErrors((prev) => ({
        ...prev,
        availability: 'Please select both date/time and duration first',
      }));
      return;
    }

    setIsCheckingAvailability(true);
    clearError('availability');

    try {
      const startTime = new Date(formData.startTime);
      const available = await checkAvailability(startTime, formData.duration);

      if (available) {
        setAvailabilityChecked(true);
      } else {
        setErrors((prev) => ({
          ...prev,
          availability:
            'This time slot is not available. Please choose a different time.',
        }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        availability: 'Failed to check availability. Please try again.',
      }));
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!availabilityChecked) {
      setErrors((prev) => ({
        ...prev,
        availability: 'Please check availability before booking',
      }));
      return;
    }

    try {
      const bookingData: CreateBookingRequest = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        inquiry: formData.inquiry.trim() || undefined,
        startTime: new Date(formData.startTime),
        duration: formData.duration,
      };

      const booking = await createBooking(bookingData);
      if (booking) {
        onSuccess?.(booking);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-900">
          Book Your Appointment
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Fill out the form below to schedule your appointment
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Personal Information
            </h3>

            <Input
              label="Full Name *"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={errors.name || ''}
              placeholder="Enter your full name"
            />

            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email || ''}
              placeholder="Enter your email address"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              error={errors.phone || ''}
              placeholder="Enter your phone number (optional)"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inquiry Details
              </label>
              <textarea
                value={formData.inquiry}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, inquiry: e.target.value }))
                }
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Tell us about your inquiry or what you'd like to discuss (optional)"
              />
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Appointment Details
            </h3>

            <DateTimePicker
              label="Preferred Date & Time *"
              value={formData.startTime}
              onChange={handleDateTimeChange}
              error={errors.startTime || ''}
              helperText="Select your preferred appointment date and time"
            />

            <Select
              label="Duration *"
              value={formData.duration}
              onChange={handleInputChange('duration')}
              options={durationOptions}
              error={errors.duration || ''}
              helperText="How long do you expect the appointment to take?"
            />

            {/* Availability Check */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Check Availability
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAvailability}
                  loading={isCheckingAvailability}
                  disabled={!formData.startTime || !formData.duration}
                >
                  {isCheckingAvailability
                    ? 'Checking...'
                    : 'Check Availability'}
                </Button>
              </div>

              {availabilityChecked && !errors.availability && (
                <div className="flex items-center text-green-600 text-sm">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Time slot is available!
                </div>
              )}

              {errors.availability && (
                <p className="text-sm text-red-600">{errors.availability}</p>
              )}
            </div>
          </div>

          {/* Global Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={loading}
              disabled={!availabilityChecked}
            >
              Book Appointment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
