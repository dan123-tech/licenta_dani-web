package com.company.carsharing.models;

import com.google.gson.annotations.SerializedName;

public class MaintenanceEvent {
    @SerializedName("id")
    private String id;

    @SerializedName("carId")
    private String carId;

    @SerializedName("performedAt")
    private String performedAt;

    @SerializedName("mileageKm")
    private Integer mileageKm;

    @SerializedName("serviceType")
    private String serviceType;

    @SerializedName("cost")
    private Double cost;

    @SerializedName("notes")
    private String notes;

    @SerializedName("car")
    private Car car;

    public String getId() { return id; }
    public String getCarId() { return carId; }
    public String getPerformedAt() { return performedAt; }
    public Integer getMileageKm() { return mileageKm; }
    public String getServiceType() { return serviceType; }
    public Double getCost() { return cost; }
    public String getNotes() { return notes; }
    public Car getCar() { return car; }
}

