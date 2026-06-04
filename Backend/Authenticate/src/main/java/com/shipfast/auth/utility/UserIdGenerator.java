package com.shipfast.auth.utility;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

public class UserIdGenerator {

    private static final AtomicInteger sequence = new AtomicInteger(0);
    private static String lastDate = "";

    public static synchronized String generateUserId() {

        String today = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyMMdd"));

        if (!today.equals(lastDate)) {
            sequence.set(0);
            lastDate = today;
        }

        int current = sequence.incrementAndGet();

        return String.format("USER%s%04d", today, current);
    }
}