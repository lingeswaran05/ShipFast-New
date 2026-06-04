package com.shipfast.auth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_profile",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "phone_number")
        })
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private String userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private UserAuth userAuth;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;

    private String address;
    private String city;
    private String state;
    private String pincode;

}