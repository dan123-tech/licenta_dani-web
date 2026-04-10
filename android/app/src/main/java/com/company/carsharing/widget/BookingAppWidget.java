package com.company.carsharing.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.company.carsharing.R;
import com.company.carsharing.ui.MainActivity;

public class BookingAppWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Context app = context.getApplicationContext();
        SharedPreferences p = app.getSharedPreferences(BookingWidgetUpdater.PREFS, Context.MODE_PRIVATE);
        String title = p.getString(BookingWidgetUpdater.KEY_TITLE, app.getString(R.string.widget_idle_title));
        String subtitle = p.getString(BookingWidgetUpdater.KEY_SUBTITLE, app.getString(R.string.widget_idle_subtitle));

        Intent launch = new Intent(app, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(app, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(app.getPackageName(), R.layout.widget_booking);
            views.setTextViewText(R.id.widget_booking_title, title);
            views.setTextViewText(R.id.widget_booking_subtitle, subtitle);
            views.setOnClickPendingIntent(R.id.widget_booking_root, pi);
            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
