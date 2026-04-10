package com.company.carsharing.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.company.carsharing.R;
import com.company.carsharing.data.repository.AuthRepository;
import com.company.carsharing.databinding.FragmentMaintenanceBinding;
import com.company.carsharing.models.MaintenanceEvent;
import com.company.carsharing.network.RetrofitClient;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MaintenanceFragment extends Fragment {
    private FragmentMaintenanceBinding binding;
    private MaintenanceAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentMaintenanceBinding.inflate(inflater, container, false);
        adapter = new MaintenanceAdapter(requireContext());
        binding.maintenanceList.setAdapter(adapter);
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setToolbarTitle(getString(R.string.maintenance_title));
        }
        load();
        return binding.getRoot();
    }

    private void load() {
        RetrofitClient.getApiService(new AuthRepository(requireContext()).getSessionPreferences())
                .getMaintenance(null)
                .enqueue(new Callback<List<MaintenanceEvent>>() {
                    @Override
                    public void onResponse(@NonNull Call<List<MaintenanceEvent>> call, @NonNull Response<List<MaintenanceEvent>> response) {
                        if (!isAdded()) return;
                        if (response.isSuccessful() && response.body() != null) {
                            List<MaintenanceEvent> list = response.body();
                            adapter.setItems(list);
                            binding.maintenanceEmpty.setVisibility(list.isEmpty() ? View.VISIBLE : View.GONE);
                        } else {
                            Toast.makeText(requireContext(), getString(R.string.maintenance_load_failed), Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<List<MaintenanceEvent>> call, @NonNull Throwable t) {
                        if (!isAdded()) return;
                        Toast.makeText(requireContext(), getString(R.string.maintenance_load_failed), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}

