"use client";
import JobPostCard from "@/components/JobPostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axiosInstance";
import { useRouter, useSearchParams } from "next/navigation";
import React, { ChangeEvent, useEffect, useState } from "react";
import { JobPost } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface JobSearch {
  role: string;
  location: string;
}

interface JobData {
  totalJobs: number;
  totalPages: number;
  currentPage: number;
  jobs: JobPost[];
}

const JobsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobSearch, setJobSearch] = useState<JobSearch>({
    role: "",
    location: "",
  });
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchJobs = async (role: string, location: string, page: number) => {
    try {
      const response = await axiosInstance.get<JobData>(
        `/api/v1/jobs?title=${role}&location=${location}&page=${page}`
      );
      setJobData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = searchParams.get("role") || "";
    const location = searchParams.get("location") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    setJobSearch({ role, location });
    setCurrentPage(page);
    fetchJobs(role, location, page);
  }, [searchParams]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setJobSearch((prev) => ({ ...prev, [name]: value }));
  };

  const searchJobs = () => {
    let query = "/jobs?";
    if (jobSearch.role) query += `role=${encodeURIComponent(jobSearch.role)}&`;
    if (jobSearch.location)
      query += `location=${encodeURIComponent(jobSearch.location)}&page=1`;
    router.replace(query);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    let query = `/jobs?role=${encodeURIComponent(
      jobSearch.role
    )}&location=${encodeURIComponent(jobSearch.location)}&page=${page}`;
    router.replace(query);
  };

  const renderPaginationItems = () => {
    if (!jobData) return null;

    const { totalPages } = jobData;
    const maxVisiblePages = 3; // Number of pages to show around the current page
    const pageNumbers = [];

    // Show first page
    pageNumbers.push(1);

    // Show ellipsis if currentPage is far from the first page
    if (currentPage > 3) {
      pageNumbers.push("ellipsis");
    }

    // Determine start and end page numbers to display
    const startPage = Math.max(
      2,
      currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(
      totalPages - 1,
      currentPage + Math.floor(maxVisiblePages / 2)
    );

    // Add pages around the current page
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // Show ellipsis if currentPage is far from the last page
    if (currentPage < totalPages - 2) {
      pageNumbers.push("ellipsis");
    }

    // Show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    return pageNumbers.map((pageNumber, index) => {
      if (pageNumber === "ellipsis") {
        return (
          <PaginationItem key={`ellipsis-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      return (
        <PaginationItem key={pageNumber}>
          <PaginationLink
            href="#"
            //@ts-ignore
            onClick={() => handlePageChange(pageNumber)}
            //@ts-ignore
            active={pageNumber === currentPage}
          >
            {pageNumber}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold my-7">Jobs</h1>
      <div className="flex flex-col sm:flex-row gap-4 mb-7">
        <Input
          name="role"
          value={jobSearch.role}
          onChange={handleChange}
          placeholder="Job Title"
          aria-label="Job Title"
        />
        <Input
          name="location"
          value={jobSearch.location}
          onChange={handleChange}
          placeholder="Location"
          aria-label="Location"
        />
        <Button onClick={searchJobs}>Find Jobs</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="max-w-md h-[10rem]" />
          <Skeleton className="max-w-md h-[10rem]" />
          <Skeleton className="max-w-md h-[10rem]" />
          <Skeleton className="max-w-md h-[10rem]" />
          <Skeleton className="max-w-md h-[10rem]" />
          <Skeleton className="max-w-md h-[10rem]" />
        </div>
      ) : (
        <div>
          {jobData && jobData.jobs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobData.jobs.map((job) => (
                <JobPostCard key={job._id} job={job} />
              ))}
            </div>
          ) : (
            <div className="text-center">No jobs found.</div>
          )}
        </div>
      )}

      {jobData && jobData.totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={() => {
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : 0}
              />
            </PaginationItem>
            {renderPaginationItems()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={() => {
                  if (currentPage < jobData.totalPages) handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage === jobData.totalPages}
                tabIndex={currentPage === jobData.totalPages ? -1 : 0}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default JobsPage;
