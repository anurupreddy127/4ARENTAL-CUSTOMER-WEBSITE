/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Vehicle-related type definitions
 */

export interface Vehicle {
  id: string;
  name: string;
  category: "economy" | "suv" | "luxury";
  price: number; // Maps to price_per_unit in DB
  priceUnit: "month"; // Only 'month' allowed
  image: string;
  features: string[];

  status:
    | "available"
    | "reserved"
    | "rented"
    | "inspection"
    | "maintenance"
    | "sold"
    | "in-stock";

  specifications: {
    seats: number;
    transmission: "automatic" | "manual";
    fuelType: "gasoline" | "diesel" | "electric" | "hybrid";
    year: number;
    brand: string;
    model: string;
    color: string;
    interior: string;
    interiorColor: string;
    driveTrain: string;
    cylinders: number;
    vin: string;
    engine: string;
    mileage: string;
    stockNumber: string;
    fuelEconomy: string;
  };

  description?: string;
  location?: string;
  stockNumber?: string;
  licensePlate?: string;
  vin?: string;
  currentMileage?: number;
  lastServiceDate?: string | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Vehicle maintenance and inspection types
export interface VehicleInspection {
  id: string;
  bookingId: string;
  vehicleId: string;
  inspectorName: string;
  exteriorCondition: number;
  interiorCondition: number;
  mechanicalCondition: number;
  damagesFound: any; // jsonb
  requiresMaintenance: boolean;
  approvedForRental: boolean;
  notes?: string;
  createdAt: Date;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  inspectionId?: string;
  maintenanceType: "routine" | "repair" | "damage" | "inspection" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  description: string;
  scheduledDate?: Date;
  completedDate?: Date;
  assignedTo?: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  partsReplaced?: any; // jsonb
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type aliases
export type VehicleStatus = Vehicle["status"];
export type VehicleCategory = Vehicle["category"];
