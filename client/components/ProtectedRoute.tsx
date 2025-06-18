"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";

const WithAuth = (WrappedComponent: React.FC) => {
  const AuthComponent: React.FC = (props) => {
    const { user, loading } = useUser();
    const router = useRouter();

    React.useEffect(() => {
      if (!loading && !user) {
        router.push("/login");
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  // Set a display name for easier debugging
  AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return AuthComponent;
};

export default WithAuth;
