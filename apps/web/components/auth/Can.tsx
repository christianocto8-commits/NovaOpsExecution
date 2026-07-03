"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
    permission: string;
    children: ReactNode;
    fallback?: ReactNode;
};

export function Can({
    permission,
    children,
    fallback = null,
}: Props) {

    const { can } = useAuth();

    if (!can(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}