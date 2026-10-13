"use client";

import { useEffect, useMemo, useState } from "react";

import { buildCheckoutDeliveryPayload, formatEcontAddressDeliveryDetails } from "@/lib/checkout/delivery-payload";
import type { EcontCity, EcontOffice } from "@/lib/shipping/econt";
import type { SpeedyCity, SpeedyOffice } from "@/lib/shipping/speedy";
import {
  ECONT_LOOKUP_UNAVAILABLE_MESSAGE,
  getEcontLookupErrorMessage,
  parseEcontCitiesResponse,
  parseEcontOfficesResponse,
  shouldFallbackToManualEcont,
} from "@/lib/shipping/econt-lookup";
import {
  SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE,
  getSpeedyLookupErrorMessage,
  parseSpeedyCitiesResponse,
  parseSpeedyOfficesResponse,
  shouldFallbackToManualSpeedy,
} from "@/lib/shipping/speedy-lookup";

const fieldClass =
  "mt-2 w-full rounded-xl border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/50 focus:ring-2 focus:ring-boutique-accent/10";

type DeliveryType = "office" | "automat" | "address";
type Courier = "" | "econt" | "speedy";
type LookupCity = EcontCity | SpeedyCity;
type PickupLocation = EcontOffice | SpeedyOffice;

function CityOptionLabel({ city }: { city: LookupCity }) {
  return (
    <span>
      {city.name}
      {city.regionName && city.regionName !== city.name ? (
        <span className="text-boutique-muted"> · {city.regionName}</span>
      ) : null}
    </span>
  );
}

export function CheckoutDeliveryFields({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const [courier, setCourier] = useState<Courier>("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("office");
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<LookupCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<LookupCity | null>(null);
  const [offices, setOffices] = useState<PickupLocation[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualOffice, setManualOffice] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualDetails, setManualDetails] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [econtAvailable, setEcontAvailable] = useState(true);
  const [speedyAvailable, setSpeedyAvailable] = useState(true);

  const useCarrierLookup =
    (courier === "econt" && econtAvailable) || (courier === "speedy" && speedyAvailable);
  const selectedCarrierAvailable =
    courier === "speedy" ? speedyAvailable : courier === "econt" ? econtAvailable : false;
  const needsOfficePicker =
    useCarrierLookup && (deliveryType === "office" || deliveryType === "automat");
  const useHiddenDeliveryFields = useCarrierLookup;

  const selectedOffice = useMemo(
    () => offices.find((office) => String(office.id) === selectedOfficeId) ?? null,
    [offices, selectedOfficeId],
  );

  const deliveryPayload = buildCheckoutDeliveryPayload({
    courier,
    deliveryType,
    city: useCarrierLookup ? selectedCity?.name ?? "" : manualCity,
    officeOrPostcode: useCarrierLookup
      ? selectedOffice
        ? `${selectedOffice.name} — ${selectedOffice.fullAddress}`
        : manualOffice
      : manualOffice,
    address: manualAddress,
    deliveryNote: manualDetails,
    selectedOffice,
  });

  const manualDeliveryDetails =
    deliveryType === "address"
      ? formatEcontAddressDeliveryDetails(manualAddress, manualDetails)
      : manualDetails;

  useEffect(() => {
    if (!useCarrierLookup) {
      setCityResults([]);
      setLookupError(null);
      return;
    }

    if (cityQuery.trim().length < 2) {
      setCityResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingCities(true);
      setLookupError(null);

      try {
        const response = await fetch(
          `/api/shipping/${courier}/cities?q=${encodeURIComponent(cityQuery.trim())}`,
          { signal: controller.signal },
        );

        const result =
          courier === "speedy"
            ? await parseSpeedyCitiesResponse(response)
            : await parseEcontCitiesResponse(response);
        if (!result.ok) {
          if (courier === "speedy") {
            setSpeedyAvailable(false);
          } else {
            setEcontAvailable(false);
          }
          setCityResults([]);
          setLookupError(
            courier === "speedy"
              ? shouldFallbackToManualSpeedy(response)
                ? SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE
                : getSpeedyLookupErrorMessage(result.reason)
              : shouldFallbackToManualEcont(response)
                ? ECONT_LOOKUP_UNAVAILABLE_MESSAGE
                : getEcontLookupErrorMessage(result.reason),
          );
          return;
        }

        if (courier === "speedy") {
          setSpeedyAvailable(true);
        } else {
          setEcontAvailable(true);
        }
        setCityResults(result.cities);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (courier === "speedy") {
          setSpeedyAvailable(false);
        } else {
          setEcontAvailable(false);
        }
        setCityResults([]);
        const reason =
          error instanceof DOMException && error.name === "AbortError"
            ? "timeout"
            : "network";
        setLookupError(
          courier === "speedy"
            ? getSpeedyLookupErrorMessage(reason)
            : getEcontLookupErrorMessage(reason),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCities(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [cityQuery, courier, useCarrierLookup]);

  useEffect(() => {
    if (!needsOfficePicker || !selectedCity) {
      setOffices([]);
      setSelectedOfficeId("");
      return;
    }

    const controller = new AbortController();

    async function loadOffices() {
      const city = selectedCity;
      if (!city) {
        return;
      }

      setLoadingOffices(true);
      setLookupError(null);

      try {
        const response = await fetch(
          `/api/shipping/${courier}/offices?cityId=${city.id}&deliveryType=${deliveryType}`,
          { signal: controller.signal },
        );

        const result =
          courier === "speedy"
            ? await parseSpeedyOfficesResponse(response)
            : await parseEcontOfficesResponse(response);
        if (!result.ok) {
          if (courier === "speedy") {
            setSpeedyAvailable(false);
          } else {
            setEcontAvailable(false);
          }
          setOffices([]);
          setSelectedOfficeId("");
          setLookupError(
            courier === "speedy"
              ? result.reason === "unavailable"
                ? SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE
                : getSpeedyLookupErrorMessage(result.reason)
              : result.reason === "unavailable"
                ? ECONT_LOOKUP_UNAVAILABLE_MESSAGE
                : getEcontLookupErrorMessage(result.reason),
          );
          return;
        }

        setOffices(result.offices);
        setSelectedOfficeId("");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (courier === "speedy") {
          setSpeedyAvailable(false);
        } else {
          setEcontAvailable(false);
        }
        setOffices([]);
        setSelectedOfficeId("");
        const reason =
          error instanceof DOMException && error.name === "AbortError"
            ? "timeout"
            : "network";
        setLookupError(
          courier === "speedy"
            ? getSpeedyLookupErrorMessage(reason)
            : getEcontLookupErrorMessage(reason),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingOffices(false);
        }
      }
    }

    void loadOffices();

    return () => {
      controller.abort();
    };
  }, [courier, deliveryType, needsOfficePicker, selectedCity]);

  function handleCourierChange(value: Courier) {
    setCourier(value);
    setDeliveryType("office");
    setSelectedCity(null);
    setCityQuery("");
    setCityResults([]);
    setOffices([]);
    setSelectedOfficeId("");
    setLookupError(null);
    if (value === "econt") {
      setEcontAvailable(true);
    }
    if (value === "speedy") {
      setSpeedyAvailable(true);
    }
  }

  function handleCitySelect(city: LookupCity) {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCityResults([]);
  }

  return (
    <section className="rounded-2xl border border-boutique-line bg-boutique-paper p-6 shadow-boutique-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-2xl text-boutique-ink">
        {title}
      </h2>

      {useHiddenDeliveryFields ? (
        <>
          <input type="hidden" name="courier" value={deliveryPayload.courier} />
          <input
            type="hidden"
            name="delivery_type"
            value={deliveryPayload.deliveryType}
          />
          <input type="hidden" name="city" value={deliveryPayload.city} />
          <input
            type="hidden"
            name="office_or_postcode"
            value={deliveryPayload.officeOrPostcode}
          />
          <input
            type="hidden"
            name="delivery_details"
            value={deliveryPayload.details}
          />
        </>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-boutique-ink">
          Куриер
          <select
            value={courier}
            required={!useHiddenDeliveryFields}
            name={useHiddenDeliveryFields ? undefined : "courier"}
            className={fieldClass}
            onChange={(event) => handleCourierChange(event.target.value as Courier)}
          >
            <option value="" disabled>
              Изберете
            </option>
            <option value="econt">Еконт</option>
            <option value="speedy">Спиди</option>
          </select>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Доставка
          <select
            value={deliveryType}
            required={!useHiddenDeliveryFields}
            name={useHiddenDeliveryFields ? undefined : "delivery_type"}
            disabled={!courier}
            className={fieldClass}
            onChange={(event) => {
              setDeliveryType(event.target.value as DeliveryType);
              setSelectedOfficeId("");
            }}
          >
            <option value="office">До офис</option>
            {courier && selectedCarrierAvailable ? (
              <option value="automat">До автомат</option>
            ) : null}
            <option value="address">До адрес</option>
          </select>
        </label>

        {useHiddenDeliveryFields ? (
          <>
            <label className="relative text-sm font-medium text-boutique-ink sm:col-span-2">
              Населено място
              <input
                value={cityQuery}
                required
                maxLength={120}
                className={fieldClass}
                placeholder="Въведете поне 2 символа"
                onChange={(event) => {
                  setCityQuery(event.target.value);
                  setSelectedCity(null);
                }}
              />
              {loadingCities ? (
                <span className="mt-2 block text-xs text-boutique-muted">
                  Зареждане на населени места...
                </span>
              ) : null}
              {cityResults.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-boutique-line bg-white shadow-boutique-sm">
                  {cityResults.map((city) => (
                    <li key={city.id}>
                      <button
                        type="button"
                        className="block w-full px-4 py-3 text-left text-sm text-boutique-ink transition hover:bg-boutique-paper"
                        onClick={() => handleCitySelect(city)}
                      >
                        <CityOptionLabel city={city} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>

            {needsOfficePicker ? (
              <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                {deliveryType === "automat" ? "Автомат" : "Офис"}
                <select
                  value={selectedOfficeId}
                  required
                  disabled={!selectedCity || loadingOffices}
                  className={fieldClass}
                  onChange={(event) => setSelectedOfficeId(event.target.value)}
                >
                  <option value="" disabled>
                    {loadingOffices
                      ? "Зареждане..."
                      : selectedCity
                        ? deliveryType === "automat"
                          ? "Изберете автомат"
                          : "Изберете офис"
                        : "Първо изберете населено място"}
                  </option>
                  {offices.map((office) => (
                    <option key={office.id} value={String(office.id)}>
                      {office.fullAddress
                        ? `${office.name} — ${office.fullAddress}`
                        : office.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {deliveryType === "address" ? (
              <>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Адрес
                  <textarea
                    value={manualAddress}
                    required
                    rows={3}
                    maxLength={500}
                    className={`${fieldClass} resize-y`}
                    onChange={(event) => setManualAddress(event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Уточнение за доставка
                  <textarea
                    value={manualDetails}
                    rows={2}
                    maxLength={500}
                    className={`${fieldClass} resize-y`}
                    placeholder="Вход, етаж, домофон или друго уточнение..."
                    onChange={(event) => setManualDetails(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                Бележка към офиса / автомата
                <textarea
                  value={manualDetails}
                  rows={2}
                  maxLength={500}
                  className={`${fieldClass} resize-y`}
                  placeholder="Ако не намирате желания офис, опишете го тук и ще се свържем с вас."
                  onChange={(event) => setManualDetails(event.target.value)}
                />
              </label>
            )}
          </>
        ) : (
          <>
            {courier === "econt" && !econtAvailable ? (
              <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {ECONT_LOOKUP_UNAVAILABLE_MESSAGE}
              </p>
            ) : null}
            {courier === "speedy" && !speedyAvailable ? (
              <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {SPEEDY_LOOKUP_UNAVAILABLE_MESSAGE}
              </p>
            ) : null}

            <label className="text-sm font-medium text-boutique-ink">
              Населено място
              <input
                name="city"
                value={manualCity}
                required
                maxLength={120}
                className={fieldClass}
                onChange={(event) => setManualCity(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Офис или пощенски код
              <input
                name="office_or_postcode"
                value={manualOffice}
                maxLength={200}
                required={deliveryType !== "address"}
                className={fieldClass}
                onChange={(event) => setManualOffice(event.target.value)}
              />
            </label>
            {deliveryType === "address" ? (
              <>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Адрес
                  <textarea
                    value={manualAddress}
                    rows={3}
                    maxLength={500}
                    required
                    className={`${fieldClass} resize-y`}
                    onChange={(event) => setManualAddress(event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                  Уточнение за доставка
                  <textarea
                    value={manualDetails}
                    rows={2}
                    maxLength={500}
                    className={`${fieldClass} resize-y`}
                    placeholder="Вход, етаж, домофон или друго уточнение..."
                    onChange={(event) => setManualDetails(event.target.value)}
                  />
                </label>
                <input
                  type="hidden"
                  name="delivery_details"
                  value={manualDeliveryDetails}
                />
              </>
            ) : (
              <label className="text-sm font-medium text-boutique-ink sm:col-span-2">
                Адрес / уточнение за офиса
                <textarea
                  name="delivery_details"
                  value={manualDetails}
                  rows={3}
                  maxLength={500}
                  className={`${fieldClass} resize-y`}
                  onChange={(event) => setManualDetails(event.target.value)}
                />
              </label>
            )}
          </>
        )}
      </div>

      {lookupError ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {lookupError}
        </p>
      ) : null}
    </section>
  );
}
