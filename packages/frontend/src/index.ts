// @roomkit/react — barrel export

// Provider
export { RoomKitProvider, useRoomKitConfig } from "./context/RoomKitProvider";
export type { RoomKitConfig, RoomKitProviderProps } from "./context/RoomKitProvider";

// Hooks
export { useAvailability } from "./hooks/useAvailability";
export type { UseAvailabilityOptions } from "./hooks/useAvailability";

export { useBooking } from "./hooks/useBooking";
export type { UseBookingOptions } from "./hooks/useBooking";

export { useBookings } from "./hooks/useBookings";
export type { UseBookingsFilters, UseBookingsOptions } from "./hooks/useBookings";

export { useRoomDetail } from "./hooks/useRoomDetail";
export type { RoomDetail, UseRoomDetailOptions } from "./hooks/useRoomDetail";

export { useLocationTree } from "./hooks/useLocationTree";
export type { LocationTreeNode, UseLocationTreeOptions } from "./hooks/useLocationTree";

export { useCreateBooking } from "./hooks/useCreateBooking";
export type { CreateBookingInput, UseCreateBookingOptions } from "./hooks/useCreateBooking";

export { useModifyBooking } from "./hooks/useModifyBooking";
export type { ModifyBookingInput, UseModifyBookingOptions } from "./hooks/useModifyBooking";

export { useCancelBooking } from "./hooks/useCancelBooking";
export type { CancelBookingInput, UseCancelBookingOptions } from "./hooks/useCancelBooking";

export { useBlackouts } from "./hooks/useBlackouts";
export type { UseBlackoutsFilters, UseBlackoutsOptions } from "./hooks/useBlackouts";

export { useExamSessions } from "./hooks/useExamSessions";
export type { UseExamSessionsFilters, UseExamSessionsOptions } from "./hooks/useExamSessions";

export { useRecurrence } from "./hooks/useRecurrence";
export type { UseRecurrenceOptions } from "./hooks/useRecurrence";

export { useBulkOperationStatus } from "./hooks/useBulkOperationStatus";
export type { UseBulkOperationStatusOptions } from "./hooks/useBulkOperationStatus";

// API client
export { ApiClient, useApiClient } from "./lib/api-client";

// Components
export { AvailabilitySearch } from "./components/AvailabilitySearch";
export type { AvailabilitySearchProps } from "./components/AvailabilitySearch";

export { RoomCard } from "./components/RoomCard";
export type { RoomCardProps } from "./components/RoomCard";

export { BookingTimeline } from "./components/BookingTimeline";
export type { BookingTimelineProps } from "./components/BookingTimeline";

export { LocationBrowser } from "./components/LocationBrowser";
export type { LocationBrowserProps } from "./components/LocationBrowser";

export { BookingForm } from "./components/BookingForm";
export type { BookingFormProps, BookingFormValues } from "./components/BookingForm";

export { ConflictBanner } from "./components/ConflictBanner";
export type { ConflictBannerProps } from "./components/ConflictBanner";

export { BookingStatusBadge } from "./components/BookingStatusBadge";
export type { BookingStatusBadgeProps } from "./components/BookingStatusBadge";

export { RecurrenceEditor } from "./components/RecurrenceEditor";
export type { RecurrenceEditorProps, RecurrenceEditMode } from "./components/RecurrenceEditor";

export { ExamScheduleView } from "./components/ExamScheduleView";
export type { ExamScheduleViewProps, ExamScheduleEntry } from "./components/ExamScheduleView";

export { BulkImportProgress } from "./components/BulkImportProgress";
export type { BulkImportProgressProps } from "./components/BulkImportProgress";

// Types — enums (runtime values)
export {
    LocationNodeType,
    BookingStatus,
    RecurrenceFrequency,
    RecurrenceModType,
    BlackoutScope,
    ExamLayoutType,
    ConflictResolutionType,
    BulkOperationType,
    BulkOperationStatus,
} from "./types";

// Types — interfaces / type aliases
export type {
    LocationNode,
    Room,
    RoomEquipment,
    RoomAccessibility,
    RoomPartition,
    OperatingHours,
    Booking,
    BookingStateTransition,
    RecurrenceRule,
    BlackoutWindow,
    ConflictRecord,
    ConfigEntry,
    PriorityTier,
    ExamSession,
    BulkOperation,
    ConflictCheckResult,
    AlternativeSuggestion,
    TimeSlot,
    AvailabilityFilter,
    AvailabilityResultItem,
    AvailabilityResult,
    Pagination,
    PaginatedResult,
    ApiResponse,
} from "./types";
