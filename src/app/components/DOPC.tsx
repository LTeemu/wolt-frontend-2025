"use client";
import { useState } from "react";
import { DistanceRange, FilteredData, FormState, Result } from "../../../types";
import { Alert } from "./Alert";

const venueOptions = [
  "home-assignment-venue-helsinki",
  "home-assignment-venue-tallinn",
];

export const getCurrentPosition = (
  successCallback: (position: GeolocationPosition) => void,
  errorCallback: (error: GeolocationPositionError) => void
) => {
  navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
};

export function calculateDistanceInMeters(
  coordinates1: [number, number],
  coordinates2: [number, number]
): number {
  const R = 6371000; // Radius of the Earth in meters
  const lat1 = coordinates1[0] * (Math.PI / 180);
  const lon1 = coordinates1[1] * (Math.PI / 180);
  const lat2 = coordinates2[0] * (Math.PI / 180);
  const lon2 = coordinates2[1] * (Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters
  return distance;
}

export function getABFromDistance(
  distance: number,
  distanceRanges: DistanceRange[]
): { a: number; b: number } | undefined {
  return distanceRanges.find(
    ({ min, max }) => distance >= min && distance < max
  );
}

export const calculateDeliveryFee = (
  deliveryDistance: number,
  basePrice: number,
  distanceRanges: DistanceRange[]
): number => {
  const ab = getABFromDistance(deliveryDistance, distanceRanges);
  if (!ab) {
    return -1;
  }
  const { a, b } = ab;
  return basePrice + a + (b * deliveryDistance) / 10;
};

export const calculateTotal = (
  cartValue: number,
  minimumSurcharge: number,
  deliveryFee: number
): number => {
  const smallOrderSurcharge = calculateSmallOrderSurcharge(
    cartValue,
    minimumSurcharge
  );
  return cartValue + smallOrderSurcharge + deliveryFee;
};

export const calculateSmallOrderSurcharge = (
  cartValue: number,
  minimumSurcharge: number
): number => {
  return Math.max(0, minimumSurcharge - cartValue);
};

export const calculateCosts = (
  formState: FormState,
  filteredData: FilteredData,
  setAlertMessage?: React.Dispatch<React.SetStateAction<string>>
) => {
  const { venueSlug, cartValue, userLatitude, userLongitude } = formState;
  const { coordinates, minimumSurcharge, basePrice, distanceRanges } =
    filteredData;
  const deliveryDistance = calculateDistanceInMeters(coordinates, [
    userLatitude,
    userLongitude,
  ]);
  const deliveryFee = calculateDeliveryFee(
    deliveryDistance,
    basePrice,
    distanceRanges
  );
  if (deliveryFee === -1) {
    if (setAlertMessage) {
      setAlertMessage(
        `Outside of delivery range. Delivery distance ${deliveryDistance.toFixed(
          1
        )} meters, max ${
          distanceRanges[distanceRanges.length - 2].max
        } meters, between points user [${formState.userLatitude}, ${
          formState.userLongitude
        }] and venue [${coordinates[0]}, ${coordinates[1]}])`
      );
    }
    return {
      total: 0,
      deliveryFee: 0,
      deliveryDistance: 0,
      smallOrderSurcharge: 0,
    };
  }
  const smallOrderSurcharge = Math.max(0, minimumSurcharge - cartValue);
  const total = calculateTotal(cartValue, minimumSurcharge, deliveryFee);
  return { total, deliveryFee, deliveryDistance, smallOrderSurcharge };
};

export function centsToEuro(cents: number): string {
  const euros = cents / 100;
  return euros.toFixed(2).replace(".", ",");
}

export default function DOPC() {
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [formState, setFormState] = useState<FormState>({
    venueSlug: venueOptions[0],
    cartValueRaw: "",
    cartValue: 0,
    userLatitude: 0,
    userLongitude: 0,
  });

  const [result, setResult] = useState<Result>({
    total: 0,
    deliveryFee: 0,
    deliveryDistance: 0,
    smallOrderSurcharge: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "cartValueRaw") {
      const sanitizedValue = value.replace(",", ".");
      const parsedValue = parseFloat(sanitizedValue);

      const newCartValueRaw = value.replace(/^0+(?=\d*[1-9])/, "");
      setFormState((prevFormState) => ({
        ...prevFormState,
        cartValueRaw: value === "" ? "0" : newCartValueRaw,
        cartValue: isNaN(parsedValue) ? 0 : Math.round(parsedValue * 100),
      }));
    } else {
      setFormState((prevFormState) => ({
        ...prevFormState,
        [name]: value,
      }));
    }
  };

  const handleGetLocation = () => {
    setAlertMessage("");
    setLoading(true);
    getCurrentPosition(
      (position) => {
        setFormState((prevFormState) => ({
          ...prevFormState,
          userLatitude: position.coords.latitude,
          userLongitude: position.coords.longitude,
        }));
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setAlertMessage("Error retrieving location: " + error.message);
      }
    );
  };

  const handleCalculateDeliveryPrice = async () => {
    setAlertMessage("");
    const { venueSlug, cartValue, userLatitude, userLongitude } = formState;

    if (!venueSlug || !cartValue || !userLatitude || !userLongitude) {
      setAlertMessage("All fields are required and cannot be zero.");
      return;
    }

    setLoading(true);

    try {
      const [venueStatic, venueDynamic] = await Promise.all([
        fetch(
          `https://consumer-api.development.dev.woltapi.com/home-assignment-api/v1/venues/${venueSlug}/static`
        ).then((res) => res.json()),
        fetch(
          `https://consumer-api.development.dev.woltapi.com/home-assignment-api/v1/venues/${venueSlug}/dynamic`
        ).then((res) => res.json()),
      ]);

      console.log(venueStatic, venueDynamic);
      const filteredData = {
        coordinates: venueStatic.venue_raw.location.coordinates,
        minimumSurcharge:
          venueDynamic.venue_raw.delivery_specs.order_minimum_no_surcharge,
        basePrice:
          venueDynamic.venue_raw.delivery_specs.delivery_pricing.base_price,
        distanceRanges:
          venueDynamic.venue_raw.delivery_specs.delivery_pricing
            .distance_ranges,
      };

      const result = calculateCosts(formState, filteredData, setAlertMessage);
      setResult(result);
    } catch (error) {
      setAlertMessage("Error calculating delivery price: " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => setAlertMessage("");

  return (
    <div
      data-testid="dopcComponent"
      className="shadow-md relative overflow-hidden shadow-black/50 pt-0 p-8 bg-sky-200 rounded-xl w-[90%] max-w-2xl mx-auto"
    >
      <h1 className="text-md px-6 shadow-[inset_2px_-1px_3px_#00000022,inset_-2px_-1px_3px_#00000022] rounded-b-full p-1 mb-4 text-center bg-white/30 text-gray-600">
        Delivery Order Price Calculator - Teemu Leinonen
      </h1>
      <h2 className="text-3xl mb-4">Details</h2>

      <form className="flex flex-col mb-4">
        <label className="mb-2">Venue Slug:</label>
        <select
          data-testid="venueSlug"
          name="venueSlug"
          value={formState.venueSlug}
          onChange={handleChange}
          className="p-2 mb-4 rounded-md border border-gray-300"
        >
          {venueOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <label className="mb-2">
          Cart Value (€) ({formState.cartValue} cents):
        </label>
        <input
          data-testid="cartValue"
          type="text"
          name="cartValueRaw"
          value={formState.cartValueRaw === "" ? "0" : formState.cartValueRaw}
          onChange={handleChange}
          className="p-2 mb-4 rounded-md border border-gray-300"
        />
        <label className="mb-2">User Latitude:</label>
        <input
          data-testid="userLatitude"
          type="number"
          step="0.01"
          name="userLatitude"
          value={formState.userLatitude}
          onChange={handleChange}
          className="p-2 mb-4 rounded-md border border-gray-300"
        />
        <label className="mb-2">User Longitude:</label>
        <input
          data-testid="userLongitude"
          type="number"
          step="0.1"
          name="userLongitude"
          value={formState.userLongitude}
          onChange={handleChange}
          className="p-2 mb-4 rounded-md border border-gray-300"
        />
      </form>

      <div className="flex flex-col sm:flex-row mb-10">
        <button
          data-testid="getLocation"
          onClick={handleGetLocation}
          disabled={loading}
          className="bg-cyan-200 mb-2 sm:mb-0 sm:mr-2 border-2 border-cyan-400 rounded-sm w-min text-nowrap p-2 disabled:opacity-50"
        >
          Get location
        </button>
        <button
          data-testid="calculate"
          onClick={handleCalculateDeliveryPrice}
          disabled={loading}
          className="bg-emerald-200 border-2 border-emerald-400 rounded-sm w-min text-nowrap p-2 disabled:opacity-50"
        >
          Calculate delivery price
        </button>
      </div>

      <h2 className="text-3xl mb-4">Price breakdown</h2>

      <ul className="flex flex-col">
        <li
          data-testid="cartValueResult"
          data-raw-value={formState?.cartValue ?? 0}
          className="mb-2"
        >
          Cart Value: {centsToEuro(formState.cartValue ?? 0)} €
        </li>
        <li
          data-testid="deliveryFeeResult"
          data-raw-value={result?.deliveryFee ?? 0}
          className="mb-2"
        >
          Delivery fee: {centsToEuro(result?.deliveryFee ?? 0)} €
        </li>
        <li
          data-testid="deliveryDistanceResult"
          data-raw-value={result?.deliveryDistance ?? 0}
          className="mb-2"
        >
          Delivery distance: {(result?.deliveryDistance ?? 0).toFixed(1)} m
        </li>
        <li
          data-testid="smallOrderSurchargeResult"
          data-raw-value={result?.smallOrderSurcharge ?? 0}
          className="mb-2"
        >
          Small order surcharge: {centsToEuro(result?.smallOrderSurcharge ?? 0)}{" "}
          €
        </li>
        <li data-testid="totalResult" data-raw-value={result?.total ?? 0}>
          Total Price: {centsToEuro(result?.total ?? 0)} €
        </li>
      </ul>

      {loading && (
        <div className="absolute backdrop-brightness-50 grid place-content-center h-full w-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-100"></div>
        </div>
      )}

      {alertMessage && (
        <Alert
          data-testid="alertMessage"
          message={alertMessage}
          onClose={handleCloseAlert}
        />
      )}
    </div>
  );
}
