@anon
Feature: Sign-in
  As a User
  I sign in with Email and Password
  So I can use Foodpocalypse from this device

  Scenario: User signs in with Email and Password
    Given I am on the sign-in page
    When I sign in with the e2e User Email and Password
    Then I am on Home
