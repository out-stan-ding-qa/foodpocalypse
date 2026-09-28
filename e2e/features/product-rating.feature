@authenticated @rating
Feature: Product Rating
  As a User
  I cycle a Rating on Product detail
  So my judgment overrides any Recommendation

  Background:
    Given an API-seeded Product with an active Diet profile and a green Rating
    And I am on that Product detail

  Scenario: Rating cycles green → yellow → red → clear → blank
    Then the Rating bubble is green
    When I tap the Rating bubble
    Then the Rating bubble is yellow
    When I tap the Rating bubble
    Then the Rating bubble is red
    When I tap the Rating bubble
    Then there is no Rating bubble
    And I see the Add Rating chip for the Diet profile
