package com.company.carsharing.ui;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.company.carsharing.R;
import com.company.carsharing.models.Reservation;
import com.company.carsharing.util.DateParseUtil;
import com.company.carsharing.util.I18n;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class HistoryAdapter extends BaseAdapter {
    private final Context context;
    private final List<Reservation> list = new ArrayList<>();
    private final OnHistoryActionListener listener;

    public interface OnHistoryActionListener {
        void onDownloadJourneySheet(Reservation r);
    }

    public HistoryAdapter(Context context, OnHistoryActionListener listener) {
        this.context = context;
        this.listener = listener;
    }

    public void setReservations(List<Reservation> reservations) {
        list.clear();
        if (reservations != null) list.addAll(reservations);
        notifyDataSetChanged();
    }

    @Override
    public int getCount() { return list.size(); }
    @Override
    public Reservation getItem(int position) { return list.get(position); }
    @Override
    public long getItemId(int position) { return position; }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.item_history, parent, false);
        }
        Reservation r = list.get(position);
        String car;
        if (r.getCar() != null) {
            String cat = r.getCar().getVehicleCategory() != null && !r.getCar().getVehicleCategory().trim().isEmpty()
                    ? r.getCar().getVehicleCategory().trim()
                    : null;
            car = r.getCar().getBrand() + " " + (r.getCar().getRegistrationNumber() != null ? r.getCar().getRegistrationNumber() : "");
            if (cat != null) car += " · " + cat;
        } else {
            car = context.getString(R.string.history_fallback_car);
        }
        ((TextView) convertView.findViewById(R.id.history_car)).setText(car);
        String statusPart = I18n.reservationStatus(context, r.getStatus() != null ? r.getStatus() : "");
        String statusKm = statusPart + (r.getReleasedKmUsed() != null ? " · " + context.getString(R.string.km_suffix_fmt, r.getReleasedKmUsed()) : "");
        ((TextView) convertView.findViewById(R.id.history_status_km)).setText(statusKm);
        Locale loc = context.getResources().getConfiguration().getLocales().get(0);
        String start = DateParseUtil.formatIsoForDisplay(r.getStartDate(), loc);
        String end = DateParseUtil.formatIsoForDisplay(r.getEndDate(), loc);
        String dates;
        if (!start.isEmpty() && !end.isEmpty()) {
            dates = start + " → " + end;
        } else if (!start.isEmpty()) {
            dates = start;
        } else {
            dates = end;
        }
        ((TextView) convertView.findViewById(R.id.history_dates)).setText(dates);

        View download = convertView.findViewById(R.id.history_download_journey);
        boolean completed = "COMPLETED".equalsIgnoreCase(r.getStatus());
        download.setEnabled(completed);
        download.setAlpha(completed ? 1f : 0.5f);
        download.setOnClickListener(v -> {
            if (listener != null) listener.onDownloadJourneySheet(r);
        });
        return convertView;
    }
}
