package com.company.carsharing.data;

import android.content.Context;
import android.content.SharedPreferences;

import com.company.carsharing.models.Car;
import com.company.carsharing.models.Reservation;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

/**
 * Last successful API payloads for read-only display when the device is offline.
 */
public final class OfflineReadCache {

    private static final String PREFS = "offline_read_cache";
    private static final String KEY_AVAILABLE_CARS = "available_cars_json";
    private static final String KEY_MY_RESERVATIONS = "my_reservations_json";
    private static final String KEY_ALL_CARS = "all_cars_json";
    private static final String KEY_ALL_RESERVATIONS = "all_reservations_json";

    private OfflineReadCache() {
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static Gson gson() {
        return new Gson();
    }

    public static void saveAvailableCars(Context ctx, List<Car> list) {
        if (list == null) return;
        prefs(ctx).edit().putString(KEY_AVAILABLE_CARS, gson().toJson(list)).apply();
    }

    public static List<Car> loadAvailableCars(Context ctx) {
        String raw = prefs(ctx).getString(KEY_AVAILABLE_CARS, null);
        if (raw == null || raw.isEmpty()) return new ArrayList<>();
        try {
            Type t = new TypeToken<List<Car>>() {
            }.getType();
            List<Car> out = gson().fromJson(raw, t);
            return out != null ? out : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static void saveMyReservations(Context ctx, List<Reservation> list) {
        if (list == null) return;
        prefs(ctx).edit().putString(KEY_MY_RESERVATIONS, gson().toJson(list)).apply();
    }

    public static List<Reservation> loadMyReservations(Context ctx) {
        String raw = prefs(ctx).getString(KEY_MY_RESERVATIONS, null);
        if (raw == null || raw.isEmpty()) return new ArrayList<>();
        try {
            Type t = new TypeToken<List<Reservation>>() {
            }.getType();
            List<Reservation> out = gson().fromJson(raw, t);
            return out != null ? out : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static void saveAllCars(Context ctx, List<Car> list) {
        if (list == null) return;
        prefs(ctx).edit().putString(KEY_ALL_CARS, gson().toJson(list)).apply();
    }

    public static List<Car> loadAllCars(Context ctx) {
        String raw = prefs(ctx).getString(KEY_ALL_CARS, null);
        if (raw == null || raw.isEmpty()) return new ArrayList<>();
        try {
            Type t = new TypeToken<List<Car>>() {
            }.getType();
            List<Car> out = gson().fromJson(raw, t);
            return out != null ? out : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static void saveAllReservations(Context ctx, List<Reservation> list) {
        if (list == null) return;
        prefs(ctx).edit().putString(KEY_ALL_RESERVATIONS, gson().toJson(list)).apply();
    }

    public static List<Reservation> loadAllReservations(Context ctx) {
        String raw = prefs(ctx).getString(KEY_ALL_RESERVATIONS, null);
        if (raw == null || raw.isEmpty()) return new ArrayList<>();
        try {
            Type t = new TypeToken<List<Reservation>>() {
            }.getType();
            List<Reservation> out = gson().fromJson(raw, t);
            return out != null ? out : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
