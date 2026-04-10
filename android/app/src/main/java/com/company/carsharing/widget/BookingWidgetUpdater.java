package com.company.carsharing.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.company.carsharing.R;
import com.company.carsharing.models.Car;
import com.company.carsharing.models.Reservation;

import java.util.List;

/**
 * Persists widget text and triggers {@link BookingAppWidget} refresh after reservation sync.
 */
public final class BookingWidgetUpdater {

    public static final String PREFS = "booking_widget_prefs";
    public static final String KEY_TITLE = "title";
    public static final String KEY_SUBTITLE = "subtitle";

    private BookingWidgetUpdater() {
    }

    public static void updateFromReservations(Context ctx, List<Reservation> reservations) {
        Context app = ctx.getApplicationContext();
        String title = app.getString(R.string.widget_idle_title);
        String subtitle = app.getString(R.string.widget_idle_subtitle);

        if (reservations != null) {
            for (Reservation r : reservations) {
                if (r == null) continue;
                if ("ACTIVE".equalsIgnoreCase(r.getStatus())) {
                    title = app.getString(R.string.widget_active_title);
                    subtitle = formatCar(r.getCar());
                    break;
                }
            }
        }

        SharedPreferences p = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit().putString(KEY_TITLE, title).putString(KEY_SUBTITLE, subtitle).apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(app);
        ComponentName cn = new ComponentName(app, BookingAppWidget.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        if (ids.length == 0) return;
        Intent intent = new Intent(app, BookingAppWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        app.sendBroadcast(intent);
    }

    private static String formatCar(Car c) {
        if (c == null) return "—";
        String b = c.getBrand() != null ? c.getBrand().trim() : "";
        String reg = c.getRegistrationNumber() != null ? c.getRegistrationNumber().trim() : "";
        if (!b.isEmpty() && !reg.isEmpty()) return b + " · " + reg;
        if (!reg.isEmpty()) return reg;
        if (!b.isEmpty()) return b;
        return "—";
    }
}
