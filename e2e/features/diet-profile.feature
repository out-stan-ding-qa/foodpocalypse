@authenticated
Feature: Diet profile
  As a User
  I create a Diet profile
  So I can track Nutrients on Products

  Scenario: User creates a Diet profile
    Given I am on the Diet profiles page
    When I create a Diet profile named "E2E Grill Profile"
    Then I see that Diet profile
