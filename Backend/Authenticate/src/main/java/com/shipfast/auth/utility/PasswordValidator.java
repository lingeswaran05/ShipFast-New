package com.shipfast.auth.utility;

import java.util.regex.Pattern;

public class PasswordValidator {

    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[0-9])" +
                    "(?=.*[a-z])" +
                    "(?=.*[A-Z])" +
                    "(?=.*[@#$%^&+=!])" +
                    "(?=\\S+$).{8,}$");

    public static boolean isValid(String password) {
        return PASSWORD_PATTERN.matcher(password).matches();
    }
}