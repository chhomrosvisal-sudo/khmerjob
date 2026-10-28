-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 28, 2026 at 09:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `khmer_job_matcher`
--

-- --------------------------------------------------------

--
-- Table structure for table `alembic_version`
--

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alembic_version`
--

INSERT INTO `alembic_version` (`version_num`) VALUES
('0005');

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

CREATE TABLE `applications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `status` varchar(30) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resume_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employers`
--

CREATE TABLE `employers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(160) NOT NULL,
  `is_demo` tinyint(1) NOT NULL,
  `demo_key` varchar(80) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `website` varchar(250) DEFAULT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employers`
--

INSERT INTO `employers` (`id`, `user_id`, `name`, `is_demo`, `demo_key`, `description`, `location`, `website`, `approved`) VALUES
(1, NULL, 'Mekong Digital Studio', 1, 'initial-frontend', '', '', '', 1),
(2, NULL, 'Lotus Learning Lab', 1, 'initial-web-intern', '', '', '', 1),
(3, NULL, 'Tonle Insights', 1, 'initial-analyst', '', '', '', 1),
(4, NULL, 'Palm Creative', 1, 'initial-react-intern', '', '', '', 1);

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` int(11) NOT NULL,
  `employer_id` int(11) NOT NULL,
  `title` varchar(160) NOT NULL,
  `description` text NOT NULL,
  `location` varchar(100) NOT NULL,
  `job_type` varchar(40) NOT NULL,
  `is_demo` tinyint(1) NOT NULL,
  `demo_key` varchar(80) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `category` varchar(80) NOT NULL DEFAULT 'other',
  `experience_level` varchar(80) NOT NULL DEFAULT 'Not specified',
  `salary_min` int(11) DEFAULT NULL,
  `salary_max` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `employer_id`, `title`, `description`, `location`, `job_type`, `is_demo`, `demo_key`, `created_at`, `is_active`, `category`, `experience_level`, `salary_min`, `salary_max`) VALUES
(1, 1, 'Junior Frontend Developer', 'DEMONSTRATION ONLY — fictional employer and vacancy. Build accessible, responsive interfaces alongside a mentor.', 'Phnom Penh', 'Full-time', 1, 'initial-frontend', '2026-10-28 08:49:00', 1, 'technology', 'Not specified', NULL, NULL),
(2, 2, 'Web Development Intern', 'DEMONSTRATION ONLY — fictional employer and vacancy. Maintain educational demo websites and test mobile experiences.', 'Siem Reap', 'Internship', 1, 'initial-web-intern', '2026-10-28 08:49:00', 1, 'technology', 'Not specified', NULL, NULL),
(3, 3, 'Junior Data Analyst', 'DEMONSTRATION ONLY — fictional employer and vacancy. Clean sample datasets and explain reports to a research team.', 'Phnom Penh', 'Full-time', 1, 'initial-analyst', '2026-10-28 08:49:00', 1, 'technology', 'Not specified', NULL, NULL),
(4, 4, 'React Developer Intern', 'DEMONSTRATION ONLY — fictional employer and vacancy. Build reusable components and learn team code reviews.', 'Remote', 'Internship', 1, 'initial-react-intern', '2026-10-28 08:49:00', 1, 'technology', 'Not specified', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `job_skills`
--

CREATE TABLE `job_skills` (
  `job_id` int(11) NOT NULL,
  `skill_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL,
  `proficiency` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `job_skills`
--

INSERT INTO `job_skills` (`job_id`, `skill_id`, `required`, `proficiency`) VALUES
(1, 1, 1, 'beginner'),
(1, 2, 1, 'beginner'),
(1, 3, 1, 'beginner'),
(1, 4, 1, 'beginner'),
(1, 5, 1, 'beginner'),
(2, 1, 1, 'beginner'),
(2, 2, 1, 'beginner'),
(2, 3, 1, 'beginner'),
(3, 6, 1, 'beginner'),
(3, 7, 1, 'beginner'),
(3, 8, 1, 'beginner'),
(4, 3, 1, 'beginner'),
(4, 4, 1, 'beginner'),
(4, 5, 1, 'beginner'),
(4, 9, 1, 'beginner');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` varchar(300) NOT NULL,
  `is_read` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oauth_flows`
--

CREATE TABLE `oauth_flows` (
  `id` varchar(64) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `browser_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL,
  `link_user_id` int(11) DEFAULT NULL,
  `link_token_version` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` varchar(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `token_hash` varchar(64) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int(11) NOT NULL,
  `used` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rate_limits`
--

CREATE TABLE `rate_limits` (
  `key` varchar(64) NOT NULL,
  `window_start` datetime NOT NULL,
  `count` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rate_limits`
--

INSERT INTO `rate_limits` (`key`, `window_start`, `count`) VALUES
('7b50bc4e3576c57f8181cbdd4f14ea329a89188ab4473cf3e03d52a4ed94ecad', '2026-10-28 07:48:50', 3),
('991e604f66c5073e0880e4b0809cfde635d4e55ea94212c99e9f0473b5b131a9', '2026-10-28 07:48:50', 3);

-- --------------------------------------------------------

--
-- Table structure for table `resumes`
--

CREATE TABLE `resumes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `filename` varchar(150) NOT NULL,
  `media_type` varchar(80) NOT NULL,
  `size` int(11) NOT NULL,
  `content` mediumblob NOT NULL,
  `detected_skill_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`detected_skill_ids`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `resume_chunks`
--

CREATE TABLE `resume_chunks` (
  `resume_id` int(11) NOT NULL,
  `part` int(11) NOT NULL,
  `content` mediumblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `saved_jobs`
--

CREATE TABLE `saved_jobs` (
  `user_id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

CREATE TABLE `skills` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_km` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `skills`
--

INSERT INTO `skills` (`id`, `name`, `name_km`) VALUES
(1, 'HTML', NULL),
(2, 'CSS', NULL),
(3, 'JavaScript', NULL),
(4, 'React', NULL),
(5, 'Git', NULL),
(6, 'Python', NULL),
(7, 'SQL', NULL),
(8, 'Excel', NULL),
(9, 'TypeScript', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `social_identities`
--

CREATE TABLE `social_identities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider` varchar(20) NOT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_profiles`
--

CREATE TABLE `student_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(80) NOT NULL,
  `education` varchar(160) NOT NULL,
  `interests` text NOT NULL,
  `experience` text DEFAULT NULL,
  `preferred_location` varchar(100) DEFAULT NULL,
  `preferred_category` varchar(80) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_skills`
--

CREATE TABLE `student_skills` (
  `student_id` int(11) NOT NULL,
  `skill_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `token_version` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `created_at`, `token_version`, `is_active`) VALUES
(2, 'admin@example.com', '$argon2id$v=19$m=65536,t=3,p=4$5RG6nZAFH753t4vGPU2Xgw$3oU5DaqW6JBnauCCcm1rAI8Z6fg5AD078fpZVAOZ3RQ', 'admin', '2026-10-28 14:48:30', 0, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alembic_version`
--
ALTER TABLE `alembic_version`
  ADD PRIMARY KEY (`version_num`);

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_application_user_job` (`user_id`,`job_id`),
  ADD KEY `job_id` (`job_id`),
  ADD KEY `fk_applications_resume` (`resume_id`);

--
-- Indexes for table `employers`
--
ALTER TABLE `employers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `demo_key` (`demo_key`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `demo_key` (`demo_key`),
  ADD KEY `ix_jobs_employer_id` (`employer_id`),
  ADD KEY `ix_jobs_title` (`title`),
  ADD KEY `ix_jobs_location` (`location`),
  ADD KEY `ix_jobs_job_type` (`job_type`);

--
-- Indexes for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD PRIMARY KEY (`job_id`,`skill_id`),
  ADD KEY `skill_id` (`skill_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_notifications_user_id` (`user_id`);

--
-- Indexes for table `oauth_flows`
--
ALTER TABLE `oauth_flows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `link_user_id` (`link_user_id`),
  ADD KEY `ix_oauth_flows_expires_at` (`expires_at`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_password_resets_user_id` (`user_id`);

--
-- Indexes for table `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `resumes`
--
ALTER TABLE `resumes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_resumes_user_id` (`user_id`);

--
-- Indexes for table `resume_chunks`
--
ALTER TABLE `resume_chunks`
  ADD PRIMARY KEY (`resume_id`,`part`);

--
-- Indexes for table `saved_jobs`
--
ALTER TABLE `saved_jobs`
  ADD PRIMARY KEY (`user_id`,`job_id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indexes for table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `social_identities`
--
ALTER TABLE `social_identities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_social_provider_subject` (`provider`,`subject`),
  ADD UNIQUE KEY `uq_social_user_provider` (`user_id`,`provider`),
  ADD KEY `ix_social_identities_user_id` (`user_id`);

--
-- Indexes for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `student_skills`
--
ALTER TABLE `student_skills`
  ADD PRIMARY KEY (`student_id`,`skill_id`),
  ADD KEY `skill_id` (`skill_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employers`
--
ALTER TABLE `employers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `resumes`
--
ALTER TABLE `resumes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `skills`
--
ALTER TABLE `skills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `social_identities`
--
ALTER TABLE `social_identities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_profiles`
--
ALTER TABLE `student_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_applications_resume` FOREIGN KEY (`resume_id`) REFERENCES `resumes` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employers`
--
ALTER TABLE `employers`
  ADD CONSTRAINT `employers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`employer_id`) REFERENCES `employers` (`id`);

--
-- Constraints for table `job_skills`
--
ALTER TABLE `job_skills`
  ADD CONSTRAINT `job_skills_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `oauth_flows`
--
ALTER TABLE `oauth_flows`
  ADD CONSTRAINT `oauth_flows_ibfk_1` FOREIGN KEY (`link_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `resumes`
--
ALTER TABLE `resumes`
  ADD CONSTRAINT `resumes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `resume_chunks`
--
ALTER TABLE `resume_chunks`
  ADD CONSTRAINT `resume_chunks_ibfk_1` FOREIGN KEY (`resume_id`) REFERENCES `resumes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `saved_jobs`
--
ALTER TABLE `saved_jobs`
  ADD CONSTRAINT `saved_jobs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `saved_jobs_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `social_identities`
--
ALTER TABLE `social_identities`
  ADD CONSTRAINT `social_identities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_skills`
--
ALTER TABLE `student_skills`
  ADD CONSTRAINT `student_skills_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
