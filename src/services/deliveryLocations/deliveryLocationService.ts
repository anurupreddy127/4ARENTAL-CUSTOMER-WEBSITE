export interface DeliveryLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryFee: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CityOption {
  city: string;
  state: string;
  locationCount: number;
  minFee: number;
}

export const deliveryLocationService = {
  async getAvailableCities(): Promise<CityOption[]> {
    return [];
  },

  async getLocationsByCity(_city: string): Promise<DeliveryLocation[]> {
    return [];
  },

  async getLocation(_id: string): Promise<DeliveryLocation | null> {
    return null;
  },

  async getDeliveryFee(_locationId: string): Promise<number> {
    return 0;
  },

  async validateLocation(_locationId: string): Promise<{
    valid: boolean;
    location: DeliveryLocation | null;
    error?: string;
  }> {
    return {
      valid: false,
      location: null,
      error: "Delivery locations are not configured.",
    };
  },
};
