export type FormState = {
    venueSlug: string;
    cartValueRaw: string,
    cartValue: number;
    userLatitude: number;
    userLongitude: number;
}

export type FilteredData = {
    coordinates: [number, number];
    minimumSurcharge: number;
    basePrice: number;
    distanceRanges: DistanceRange[];
}

export type DistanceRange = {
    min: number;
    max: number;
    a: number;
    b: number;
    flag: null;
};

export type Result = {
    total: number;
    deliveryFee: number;
    deliveryDistance: number;
    smallOrderSurcharge: number;
};
