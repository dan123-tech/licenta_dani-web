package com.company.carsharing.ui;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.company.carsharing.R;
import com.company.carsharing.models.Car;
import com.company.carsharing.models.MaintenanceEvent;
import com.company.carsharing.util.DateParseUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MaintenanceAdapter extends BaseAdapter {
    private final Context context;
    private final List<MaintenanceEvent> list = new ArrayList<>();

    public MaintenanceAdapter(Context context) {
        this.context = context;
    }

    public void setItems(List<MaintenanceEvent> items) {
        list.clear();
        if (items != null) list.addAll(items);
        notifyDataSetChanged();
    }

    @Override
    public int getCount() { return list.size(); }
    @Override
    public MaintenanceEvent getItem(int position) { return list.get(position); }
    @Override
    public long getItemId(int position) { return position; }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.item_maintenance, parent, false);
        }
        MaintenanceEvent e = list.get(position);
        Car c = e.getCar();
        String carLabel = c != null
                ? (safe(c.getBrand()) + " " + safe(c.getRegistrationNumber())).trim()
                : context.getString(R.string.history_fallback_car);
        ((TextView) convertView.findViewById(R.id.maint_car)).setText(carLabel);

        String service = safe(e.getServiceType());
        ((TextView) convertView.findViewById(R.id.maint_service)).setText(service.isEmpty() ? "—" : service);

        Locale loc = context.getResources().getConfiguration().getLocales().get(0);
        String date = DateParseUtil.formatIsoForDisplay(e.getPerformedAt(), loc);
        String km = e.getMileageKm() != null ? context.getString(R.string.km_suffix_fmt, e.getMileageKm()) : "—";
        String cost = e.getCost() != null ? String.format(Locale.getDefault(), "%.2f", e.getCost()) : "—";
        ((TextView) convertView.findViewById(R.id.maint_meta)).setText(date + " · " + km + " · " + cost);
        return convertView;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}

