import { fireEvent, render } from "@testing-library/react";
import DOPC, {
  calculateTotal,
  calculateDeliveryFee,
  calculateDistanceInMeters,
  getABFromDistance,
  getCurrentPosition,
  calculateSmallOrderSurcharge,
  centsToEuro,
  calculateCosts,
} from "../src/app/components/DOPC";
import { FilteredData, FormState } from "../types";
import "@testing-library/jest-dom";

describe("DOPC", () => {
  it("renders without crashing", () => {
    const { getByTestId } = render(<DOPC />);
    expect(getByTestId("dopcComponent")).toBeInTheDocument();
  });

  it("inputs update raw data correctly", () => {
    const { getByTestId } = render(<DOPC />);

    const cartValueInput = getByTestId("cartValue");
    fireEvent.change(cartValueInput, { target: { value: "10.05" } });
    const cartValueResult = getByTestId("cartValueResult");
    expect(cartValueResult).toHaveAttribute("data-raw-value", "1005");
  });

  it("Calculates delivery fees correctly", () => {
    const distances = [0, 500, 1400, 1500, 2000];
    const expectedResults = [100, 200, 300, 450, -1];

    distances.forEach((distance, index) => {
      const result = calculateDeliveryFee(distance, 100, [
        {
          min: 0,
          max: 500,
          a: 0,
          b: 0,
          flag: null,
        },
        {
          min: 500,
          max: 1000,
          a: 100,
          b: 0,
          flag: null,
        },
        {
          min: 1000,
          max: 1500,
          a: 200,
          b: 0,
          flag: null,
        },
        {
          min: 1500,
          max: 2000,
          a: 200,
          b: 1,
          flag: null,
        },
        {
          min: 2000,
          max: 0,
          a: 0,
          b: 0,
          flag: null,
        },
      ]);
      expect(result).toBe(expectedResults[index]);
    });
  });

  describe("calculateDistanceInMeters", () => {
    it("returns the distance in meters for zero distance", () => {
      expect(calculateDistanceInMeters([0, 0], [0, 0])).toBe(0);
    });

    it("returns the distance in meters from Helsinki to Oulu", () => {
      const result = calculateDistanceInMeters(
        [60.16952, 24.93545],
        [65.0121, 25.4651]
      );
      expect(Math.abs(result - 540000)).toBeLessThan(1000);
    });
  });

  describe("centsToEuro", () => {
    it("returns the euro value for positive cents", () => {
      expect(centsToEuro(1050)).toBe("10,50");
    });

    it("returns the euro value for zero cents", () => {
      expect(centsToEuro(0)).toBe("0,00");
    });

    it("returns the euro value for large cents", () => {
      expect(centsToEuro(123456)).toBe("1234,56");
    });
  });

  it("returns the correct total, delivery fee, delivery distance, and small order surcharge", () => {
    const formState: FormState = {
      venueSlug: "test-venue",
      cartValueRaw: "10,00",
      cartValue: 1000,
      userLatitude: 60.0121,
      userLongitude: 25.2651,
    };
    const filteredData: FilteredData = {
      coordinates: [60.008, 25.24545],
      minimumSurcharge: 100,
      basePrice: 100,
      distanceRanges: [
        { min: 0, max: 500, a: 0, b: 0, flag: null },
        { min: 500, max: 1000, a: 100, b: 0, flag: null },
        { min: 1000, max: 1500, a: 200, b: 0, flag: null },
        { min: 1500, max: 2000, a: 200, b: 1, flag: null },
        { min: 2000, max: 0, a: 0, b: 0, flag: null },
      ],
    };
    const result = calculateCosts(formState, filteredData);
    const deliveryFee = calculateDeliveryFee(
      result.deliveryDistance,
      filteredData.basePrice,
      filteredData.distanceRanges
    );

    expect(result).toEqual({
      total: calculateTotal(
        formState.cartValue,
        filteredData.minimumSurcharge,
        deliveryFee
      ),
      deliveryFee: deliveryFee,
      deliveryDistance: calculateDistanceInMeters(filteredData.coordinates, [
        formState.userLatitude,
        formState.userLongitude,
      ]),
      smallOrderSurcharge: calculateSmallOrderSurcharge(
        formState.cartValue,
        filteredData.minimumSurcharge
      ),
    });
  });
});
